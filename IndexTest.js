const TelegramBot = require('node-telegram-bot-api');
const jwt_decode = require('jwt-decode');
const sha256 = require('sha256')
const fs = require('fs')
const axios = require('axios').default;
require('dotenv').config()

// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.BOT_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

var txnId = [];
const api_token = [];
// const beneficiary_reference_id = [];

const generateOTP = async (mobileNumber, chatId) => {
  await axios
  .post('https://cdn-api.co-vin.in/api/v2/auth/public/generateOTP', {
    mobile: `${mobileNumber}`
  })
  .then(res => {
    txnId.push(res['data'].txnId)
  })
  .catch(error => {
    bot.sendMessage(chatId, 'Already Shared OTP ...');
  })
};

const confirmOTP = async (OTP) => {
  otp = sha256(OTP);
  let status = ''
  
  await axios
  .post('https://cdn-api.co-vin.in/api/v2/auth/public/confirmOTP', {
    otp: `${otp}`,
    txnId: `${txnId}`
  })
  .then(res => {
    api_token.push(res['data'].token)
  })
  .catch(error => {
    console.error(error)
  })

  return status
};

const sendCertificate = async (api_token) => {
  const final_token = JSON.stringify(api_token);

  let decoded = jwt_decode(final_token);
  let beneficiary_reference_id = decoded.beneficiary_reference_id

  const response = await axios
  .get( `https://cdn-api.co-vin.in/api/v2/registration/certificate/public/download?beneficiary_reference_id=${beneficiary_reference_id}`,
    {
		headers: {
			"Authorization": `Bearer ${api_token}`,
			"accept": 'application/pdf'
      	}
    }
  )
  .then(res => {
    bot.sendMessage(chatId, 'Sent please check', res);
  })
  .catch(error => {
    console.error(error)
  })

  return response
};

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', async (msg, match) => {
  const chatId = msg.chat.id;
  const resp = msg.text;
  
  if(resp.length == 10){
    await generateOTP(resp, chatId);
    bot.sendMessage(chatId, 'Share OTP ...');
  }
  else if(resp.length == 6){
    const status = await confirmOTP(resp);
    txnId = []
    if(status == 200){
      const certificate = await sendCertificate(api_token);
      bot.sendDocument(chatId, "Thanks ",certificate);
    }
    bot.sendMessage(chatId, 'Sent ...');
  }
  else{
    bot.sendMessage(chatId, 'Something went wrong ...')
  }
});