
const dotenv = require('dotenv');
dotenv.config();

//  required variables
const requiredEnvVars = [
    'PORT',
    'NODE_ENV',
    // 'MONGODB_URI',
    // 'JWT_SECRET',
    // 'OPENAI_API_KEY'
];


const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease add these to your .env file');
    process.exit(1);
}

console.log(' All environment variables are valid!');

// Export configuration
const config = {
    port: parseInt(process.env.PORT, 10) || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    isTest: process.env.NODE_ENV === 'test',
    
    // database: {
    //     uri: process.env.MONGODB_URI,
    // },
    
    // jwt: {
    //     secret: process.env.JWT_SECRET,
    //     expire: process.env.JWT_EXPIRE || '7d',
    // },
    
    // openai: {
    //     apiKey: process.env.OPENAI_API_KEY,
    // },
    
    // weather: {
    //     apiKey: process.env.WEATHER_API_KEY,
    // },
    
    // cloudinary: {
    //     cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    //     apiKey: process.env.CLOUDINARY_API_KEY,
    //     apiSecret: process.env.CLOUDINARY_API_SECRET,
    // },
};

module.exports = config;