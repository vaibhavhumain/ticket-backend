const nodemailer = require("nodemailer");

async function testEmail() {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Ticket System" <${process.env.EMAIL_USER}>`,
    to: "soodvaibhav852@gmail.com", 
    subject: "Test Email ✔",
    text: "Hello, this is a test from Ticket System",
  });

  console.log("✅ Test email sent");
}

testEmail().catch(console.error);
