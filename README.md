# Ota-atem
## Features
- Custom tally light for ATEM
- Automatically create & upload ATEM media player images based on HTML template & texts
- Frontend with tally light and media text/lowerthirds controls
- Also supports arduino based tallylight

## Arch
- Frontend React.js
- Backend nodejs with express and also ws server
- Tally light status and media goes thru websockets, most controls via HTTP

## Config
- See config.json.template and lowerthirds.json.template in backend and copy to config.json & lowerthirds.json. 
- Currently template files (for some reason) are stored within the backend lowerthirds src folder
- Run: `yarn prod` - builds both frontend and backend, and hosts them on the same server
- For dev usage run `yarn start` in frontend and `yarn dev` in backend