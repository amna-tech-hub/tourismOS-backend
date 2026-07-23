
const dotenv = require('dotenv');
dotenv.config();

//  required variables
const requiredEnvVars = [
    'PORT',
    'NODE_ENV',
    'MONGODB_URI',
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


// Export configuration
const config = {
    port: parseInt(process.env.PORT, 10) || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    isTest: process.env.NODE_ENV === 'test',
    
     database: {
         uri: process.env.MONGODB_URI,
     },
    
   
};

module.exports = config;