import { CronJob } from 'cron'
import queue from './the-queue'

var job = null

function enqueueTasks() {
  const {
    attach_album_art,
    fetch_playlists,
    fetch_audios,
    fetch_album_art,
    create_m3u
  } = require('./tasks')

  queue.add(fetch_playlists).catch(err => {
    console.error(err)
  })
  //queue.add(fetch_audios).catch(err => {
  //  console.error(err)
  //})
  //queue.add(fetch_album_art).catch(err => {
  //  console.error(err)
  //})
  //queue.add(attach_album_art).catch(err => {
  //  console.error(err)
  //})
  //queue.add(create_m3u).catch(err => {
  //  console.error(err)
  //})
}

export function schedule() {
  if (job) {
    return Promise.try(() => {
      job.start()
    })
  }

  const sequelize = require('../models').default
  return sequelize
    .authenticate()
    .then(() => {
      return sequelize.sync()
    })
    .then(() => {
      job = new CronJob(
        `00 */5 * * * *`,
        enqueueTasks,
        null, // onComplete
        true, // start now
        'Asia/Shanghai',
        null, // context
        true // run on init
      )
      return job
    })
}

export function unschedule() {
  return Promise.try(() => {
    if (job) job.stop()
  })
}