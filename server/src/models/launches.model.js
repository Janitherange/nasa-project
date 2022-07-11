require('dotenv').config();
const launchesDatabase = require("./launches.mongo");
const planets = require("./planets.mongo");
const axios = require("axios");

const DEFAULT_FLIGHT_NUMBER = 100;

const SPACEX_API_URL = process.env.SPACEX_API_URL;

async function populatelaunches() {
  const response = await axios.post(SPACEX_API_URL, {
    query: {},
    pagination: false,
    options: {
      populate: [
        {
          path: "rocket",
          select: {
            name: 1,
          },
        },
        {
          path: "payloads",
          select: {
            customers: 1,
          },
        },
      ],
    },
  });

  if (response.status !== 200) {
    console.log(`Problem downloading launch data`);
    throw new Error(`Launch data download failed`);
  }

  const launchDocs = response.data.docs;
  for (let launchDoc of launchDocs) {
    const launch = {
      flightNumber: launchDoc.flight_number,
      mission: launchDoc.name,
      rocket: launchDoc.rocket.name,
      launchDate: launchDoc.date_local,
      customers: launchDoc.payloads.flatMap((payload) => payload.customers),
      upcoming: launchDoc.upcoming,
      success: launchDoc.success,
    };

    await saveLaunch(launch);
  }
}

async function loadLaunchData() {
  const firstLaunch = await findLaunch({
    flightNumber: 1,
    rocket: "Falcon 1",
    mission: "FalconSat",
  });

  if (firstLaunch) {
    console.log("Launches already loaded");
  } else {
    await populatelaunches();
  }
}

async function findLaunch(filter) {
  return await launchesDatabase.findOne(filter);
}

async function existLaunchWithId(launchId) {
  return await findLaunch({
    flightNumber: launchId,
  });
}

async function getLatestFlihtNumber() {
  const lastestLaunches = await launchesDatabase
    .findOne()
    .sort("-flightNumber");

  if (!lastestLaunches) {
    return DEFAULT_FLIGHT_NUMBER;
  }

  return lastestLaunches.flightNumber;
}

async function getAllLaunches(skip, limit) {
  return await launchesDatabase
    .find(
      {},
      {
        __v: 0,
        _id: 0,
      }
    )
    .sort({
      flightNumber: 1,
    })
    .skip(skip)
    .limit(limit);
}

async function saveLaunch(launch) {
  await launchesDatabase.findOneAndUpdate(
    {
      flightNumber: launch.flightNumber,
    },
    launch,
    {
      upsert: true,
    }
  );
}

async function sheduleNewLaunch(launch) {
  const planet = await planets.findOne({
    keplerName: launch.target,
  });

  if (!planet) {
    throw new Error(`Planet ${launch.target} not found`);
  }

  const newFlightNumber = (await getLatestFlihtNumber()) + 1;

  const newLaunch = Object.assign(launch, {
    success: true,
    upcoming: true,
    customers: ["NASA", "SpaceX"],
    flightNumber: newFlightNumber,
  });

  await saveLaunch(newLaunch);
}

async function existLaunchWithId(launchId) {
  return await launchesDatabase.findOne({
    flightNumber: launchId,
  });
}

async function abortLaunchById(launchId) {
  const aborted = await launchesDatabase.updateOne(
    {
      flightNumber: launchId,
    },
    {
      upcoming: false,
      success: false,
    }
  );

  return aborted.modifiedCount === 1;
}

module.exports = {
  loadLaunchData,
  getAllLaunches,
  sheduleNewLaunch,
  existLaunchWithId,
  abortLaunchById,
};
