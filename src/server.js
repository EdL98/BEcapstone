import express, { json } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import mqtt from 'mqtt';
import cors from 'cors';
//"mongoose": "^8.8.0", 


const app = express();
app.use(cors())
dotenv.config();
//const port=3000  //FOR TESTING
const PORT = process.env.PORT || 7000;
const MONGOURL = process.env.MONGO_URL_CLOUD;
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL_mos; 
const MQTT_TOPIC = process.env.MQTT_TOPIC; 


mongoose.pluralize(null);
/**Connection to Mongo DB  */
mongoose.connect(MONGOURL).then(()=>{
    console.log("Database is connected successfully!");
    app.listen(PORT,()=>{
        console.log(`Server is running on port ${PORT}`);
    });
}).catch((error)=>console.log(error));

// Data type in mongodb
const userSchema = new mongoose.Schema({
    Index:Number,
    Date: String,
    Time: String,
    Location :String,
    Readings :Number,
    Battery: Number

});

const UserModel = mongoose.model("Anything", userSchema, "capstone"); //3rd parameter is collection 

// Connect to the MQTT broker
const client = mqtt.connect(MQTT_BROKER_URL);


let nextIndex = 1;

// Fetch the latest index from MongoDB
async function initializeIndex() {
    const latestEntry = await UserModel.findOne().sort({ Index: -1 });
    if (latestEntry) {
        nextIndex = latestEntry.Index + 1;
    }
}

initializeIndex();


// Subscribe to the topic after successful connection
client.on('connect', () => {
    console.log('Connected to broker');
    client.subscribe(MQTT_TOPIC, (err) => {
      if (!err) {
        console.log(`Subscribed to topic: ${MQTT_TOPIC}`);
      } else {
        console.error(`Subscription error: ${MQTT_TOPIC}`);
      }
    });
  });

// Handle the incoming messages from the mqtt broker

client.on('message', async(topic,message)=>{
    try{
        const payload =JSON.parse(message.toString());
        const {Date,Time,Location, Readings,Battery} = payload;

        // Fetch the latest index dynamically right before inserting
        const latestEntry = await UserModel.findOne().sort({ Index: -1 });

        const currentIndex = latestEntry ? latestEntry.Index + 1 : 1;


        // create new document based on the retrieved data
        const newData = new UserModel({
            Index:currentIndex,
            //Date: new Date(),
            //Time:new Date().toLocaleTimeString(),
            Date, Time, Location, Readings, Battery
        });
        // Increment nextIndex for the next entry
        nextIndex += 1;
        //save the data to MongoDB
        await newData.save();
        console.log(`Date is saved to MongoDB:${JSON.stringify(newData)}`);
    } catch (error){
        console.error('Error Processing the MQTT Message:',error);
    }
})
// Collect Data from Mongo DB /// Endpoint to retrieve data from MongoDB
app.get("/getUsers", async(req,res)=>{
    const userData= await UserModel.find();
    res.json(userData);
})

//fake data for sending to mongodb
/*
var data=[
    {
        Location:'Rooftop',
        Readings: 200,
    },
    {
        Location:'Rooftop',
        Readings:300,
    },
];
*/


// insert Data to Mongo DB
/*
UserModel.insertMany(data);
*/


/*                  // TESTING 
app.use(express.json());
app.put('/api/data/:meter_ID/readings', (req,res) =>{
    const {meter_ID} =req.params;
    const meter = dataInfo.find(a=>a.meter_ID ===meter_ID);
    if (meter)
    {
        res.send(`The ${meter.meter_ID} has a reading of ${meter.readings} m^3.`);   
    }
    else
    {
        res.send(`No such meter`);
    }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
*/