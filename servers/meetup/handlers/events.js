"use strict";

/**
 * getAllEvents selects all events, and responds with event information
 * encoded as json
 * @param {Request} req HTTP request object 
 * @param {Response} res HTTP response object
 */
async function getAllEvents(req, res) {
  const db = req.db;
  const allEvents = [];
  try {
    const qry = "SELECT * FROM Events;";
    const events = await db.query(qry);
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const eventInfo = {
        "id": event.ID,
        "title": event.Title,
        "datetime": event.EventDateTime,
        "channel": event.ChannelID,
        "location": event.LocationOfEvent,
        "description": event.DescriptionOfEvent
      }
      allEvents.push(eventInfo);
    }
  } catch (err) {
    console.log(err.message);
    res.set("Content-Type", "text/plain");
    res.status(500).send("Server Error: Cannot select events in database.");
    db.end();
    return;
  }
  db.end();
  res.status(200).json(allEvents)
}

/**
 * createNewEvent creates new event using information from event form. 
 * A new channel is also created that is associated with this event.
 * @param {Request} req HTTP request object 
 * @param {Response} res HTTP response object
 */
async function createNewEvent(req, res) {
  const user = JSON.parse(req.get("X-User"));
  const event = req.body;
  const db = req.db;
  const createdAt = getDateTime();
  try {
    // Insert channel members into database if applicable
    const qryOne = "INSERT INTO Channels (ChannelName, ChannelDescription, PrivateChannel, TimeCreated, Creator, LastUpdated) VALUES (?,?,?,?,?,?);";
    // Insert creator of channel into member table
    const result = await db.query(qryOne, [event.title, event.description, false, createdAt, user.id, createdAt])
    const channelID = result.insertId;
    const qryTwo = "INSERT INTO Events (Title, EventDateTime, ChannelID, LocationOfEvent, DescriptionOfEvent) VALUES (?,?,?,?,?);";
    await db.query(qryTwo, [event.title, event.datetime, channelID, event.location, event.description]);
  } catch (err) {
    console.log(err.message);
    res.set("Content-Type", "text/plain");
    res.status(500).send("Server Error: Cannot create new event or channel.");
    db.end();
    return;
  }
  db.end();
  res.status(201);
}

/**
 * joinEvent adds the current user to the given meetup event
 * @param {Request} req HTTP request object
 * @param {Response} res HTTP response object
 */
async function joinEvent(req, res) {
  const user = JSON.parse(req.get("X-User"));
  const db = req.db;
  try {
    const qryOne = "INSERT INTO UsersJoinEvents (UserID, EventID) VALUES (?,?);";
    await db.query(qryOne, [user.id, req.body.id]);
  } catch (err) {
    console.log(err.message);
    res.set("Content-Type", "text/plain");
    res.status(500).send("Server Error: Cannot insert into UsersJoinEvents.");
    db.end();
    return;
  }
  db.end();
  res.status(200);
}

/**
 * getJoinedEvents responds with a JSON list of all the meetup events the current user is a member of
 * @param {Request} req HTTP request object
 * @param {Response} res HTTP response object
 */
async function getJoinedEvents(req, res) {
  const user = JSON.parse(req.get("X-User"));
  const db = req.db;
  let userEvents = [];
  try {
    const qryOne = "SELECT * FROM Events WHERE ID IN (SELECT EventID FROM UsersJoinEvents WHERE UserID = ?);";
    const events = await db.query(qryOne, user.id);
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const eventInfo = {
        "id": event.ID,
        "title": event.Title,
        "datetime": event.EventDateTime,
        "channel": event.ChannelID,
        "location": event.LocationOfEvent,
        "description": event.DescriptionOfEvent
      }
      userEvents.push(eventInfo);
    }
  } catch (err) {
    console.log(err.message);
    res.set("Content-Type", "text/plain");
    res.status(500).send("Server Error: Cannot select joined events.");
    db.end();
    return;
  }
  db.end();
  res.status(200).json(userEvents);
}

/**
 * getDateTime returns the current datetime
 * @returns {string} the current datetime
 */
function getDateTime() {
  const today = new Date();
  const date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
  const time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
  const dateTime = date + ' ' + time;
  return dateTime;
}

/**
 * Expose public handler functions.
 */
module.exports = {
  getAllEvents,
  createNewEvent,
  joinEvent,
  getJoinedEvents
}