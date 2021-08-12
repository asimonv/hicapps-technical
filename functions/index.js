require("dotenv").config();
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");

const serviceAccount = require("./hicapps-andre-simon-firebase-adminsdk-n732x-88efb355a2.json");

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.PATH_DB_URL,
});

const ref = "/pacientes/";
const logRef = "/logs";
const db = app.database();

const saveLog = (message) => {
  const logId = uuidv4();

  return db.ref(logRef).child(logId).set({
    createdAt: Date.now(),
    message,
  });
};

exports.pacientes = functions.https.onRequest(async (req, res) => {
  const { method } = req;

  try {
    await saveLog(`Acceso a endpoint ${method} /pacientes`);
  } catch (error) {
    res.send(error);
  }

  if (method === "GET") {
    const pacienteId = req.params[0].replace("/", "");

    try {
      const snapshot = await db
        .ref(`${ref}${pacienteId ? `${pacienteId}` : ""}`)
        .once("value");

      if (pacienteId) {
        const { accessible } = snapshot.val();
        if (accessible) {
          res.send(snapshot);
        } else {
          res.status(403).send();
        }
      }
      // asumi que solo debia retornar pacientes que accessible=true
      const snapshotData = snapshot.val();
      const filteredSnapshot = Object.keys(snapshotData)
        .map((k) => ({ ...snapshotData[k], id: k }))
        .filter((x) => x.accessible);
      res.send(filteredSnapshot);
    } catch (error) {
      await saveLog(JSON.stringify(error));
    }
  }

  if (method === "POST") {
    const pacienteId = uuidv4();
    try {
      const snapshot = await db.ref(ref).child(pacienteId).set(req.body);

      res.send(snapshot);
    } catch (error) {
      await saveLog(JSON.stringify(error));
    }
  }

  res.status(403).send();
});
