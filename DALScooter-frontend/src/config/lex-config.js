export const LEX_CONFIG = {
  BOT_ID: 'S63TU5WQQB',
  
  BOT_ALIAS_ID: 'E7GYXPI90T',
  
  LOCALE_ID: 'en_US',
  
  
  API_ENDPOINT: 'https://n5y8xtov2h.execute-api.ca-central-1.amazonaws.com/prod/lex-chat',
  
  
  REGION: process.env.REACT_APP_AWS_REGION || 'ca-central-1'
};


export const getLexApiEndpoint = () => {
  return LEX_CONFIG.API_ENDPOINT;
};


export const getBotConfig = () => {
  return {
    botId: LEX_CONFIG.BOT_ID,
    botAliasId: LEX_CONFIG.BOT_ALIAS_ID,
    localeId: LEX_CONFIG.LOCALE_ID
  };
}; 