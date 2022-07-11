const express = require('express');

const {httpGetAllLaunches, httpAddNewLaunch, httpAbortaunch} = require('./launches.controller');

const launchesRouter = express.Router();

launchesRouter.get('/', httpGetAllLaunches);
launchesRouter.post('/', httpAddNewLaunch);
launchesRouter.delete('/:id', httpAbortaunch);

module.exports=launchesRouter;