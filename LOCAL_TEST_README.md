##INSTALL DEPENDENCIES
- npm install ngrok -g
- ngrok authtoken 21d6PGMnxOY3KeOjmqT42hmpATL_2DfRAa6mcZH1sewTjRFf8
- Install dependencies using the instructions from the readme file of the libertas-sc project
- Install dependencies using the instructions from the readme file of the libertas-backend project

##LOCAL LAUNCH AND TESTING:
- cd `<libertas-sc>`
- yarn fork_fantom_testnet

  Open a new terminal window
- truffle migrate --network fantom_ganache_fork

  Open a new terminal window
- ngrok http `<port or address on which ganache is running>`

  Open a new terminal window
- cd `<libertas-backend>`
- Before launching the application, ake the http address displayed by the ngrok console and assign it to the WEB3_PROVIDER_HOST_FANTOM variable in  the .env file with 'http' replaced by 'wss'. (Example: http://6932-95-32-2-29.ngrok.io changing to wss://6932-95-32-2-29.ngrok.io)
- docker-compose -f docker-compose-local.yml --env-file .env up

  Open a new terminal window
- cd `<libertas-sc>`
- yarn test
