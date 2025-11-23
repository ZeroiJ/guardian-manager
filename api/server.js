require('dotenv').config();
const app = require('./index');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Local API Server running on port ${PORT}`);
});
