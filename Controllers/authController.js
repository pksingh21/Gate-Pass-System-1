const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const nodemailer = require("nodemailer");

const requestModel = require("./../models/requestModel");
const QRCode = require("qrcode");
const UserModel = require("../models/UserModel");

exports.getAllRequestForAdmin = catchAsync(async (req, res, next) => {
  const requests = await requestModel
    .find({ status: "pending" })
    .populate("bookedby")
    .exec();
  if (!requests) {
    return next(new AppError("No doc found with that id", 404));
  }
  res.render("gaurd", { requests: requests });
});

exports.updateRequestStatus = catchAsync(async (req, res, next) => {
  const requestId = req.params.requestId;
  const status = req.params.status;

  const request = await requestModel
    .findById(requestId)
    .populate("bookedby")
    .exec();

  if (!request) {
    return next(new AppError("No doc found with that id", 404));
  }
  // qr code generation
  let date =
    request.Date.getDate() +
    "/" +
    (request.Date.getMonth() + 1) +
    "/" +
    request.Date.getFullYear();

  let data =
    "Date of leaving :" +
    date +
    "\n Email: " +
    request.bookedby.mailId +
    "\n Student Name :" +
    request.bookedby.name +
    "\nRoom No:" +
    request.bookedby.roomNo +
    " " +
    request.bookedby.hostel +
    "\nGate pass request Confirmed";
  QRCode.toFile("./public/myqr.png", data, {}, function (err) {
    if (err) throw err;
    console.log("done");
  });
  // qr code generation end

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.NODEMAILER_ID,
      pass: process.env.NODEMAILER_PASSWORD,
    },
  });
  if (status == "rejected") {
    await requestModel.findByIdAndDelete(requestId);

    var mailOptions = {
      from: process.env.NODEMAILER_ID,
      to: request.bookedby.mailId,

      subject: "GATE-PASS Request",
      text: `${request.bookedby.name} your Gate Pass request is rejected`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else console.log("Mail send successfully");
    });
    return res.redirect("/request/admin");
  }

  // const requsetUser = await UserModel.findById(request.bookedby._id);

  const requsetUser = await UserModel.findByIdAndUpdate(request.bookedby._id, {
    $inc: { requestsPerMonth: 1 },
  });

  if (requsetUser.requestsPerMonth >= parseInt(process.env.requestsPerMonth))
    return next(
      new AppError("You have already made 2 requests in this month", 404)
    );

  request.status = "confirmed";
  // requsetUser.requestsPerMonth++;
  requsetUser.save();
  //send a mail to user that request is confirmed
  var mailOptions = {
    from: process.env.NODEMAILER_ID,
    to: request.bookedby.mailId,
    subject: "GATE-PASS Request",
    text: `${request.bookedby.name} your Gate Pass request is ${request.status}`,
    attachments: [
      {
        filename: "qr.png",
        path: "./public/myqr.png",
        cid: "unique@cid",
      },
    ],
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else console.log("Mail send successfully");
  });

  await request.save();
  res.redirect("/request/admin");
});
