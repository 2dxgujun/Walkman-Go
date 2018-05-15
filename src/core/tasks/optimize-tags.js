import ID3v1 from '../../utils/ID3v1'
import ID3v2 from 'node-id3'
import FLAC from 'node-flac'
import Sequelize from 'sequelize'
import sequelize, { Album, Artist, Playlist, Song, Local } from '../../models'
import Processor from '../../utils/promise-processor'
import Logger from '../../utils/logger'

Promise.promisifyAll(ID3v2)

const ID_OPTIMIZED = 'WG_OPT'

const Log = new Logger('OPTIMIZE')

export default function() {
  Log.d('Start optimize tags')
  return prepare()
    .then(run)
    .catch(err => {
      return Log.e('Uncaught Error when optimize tags', err)
    })
}

function prepare() {
  const processor = Processor.create()

  return Song.all({
    include: [
      {
        model: Artist,
        as: 'artists'
      },
      {
        model: Local,
        as: 'audios'
      }
    ]
  })
    .map(song => {
      song.audios.filter(audio => !isOptimized).forEach(audio => {
        return processor.add(() => {
          Log.d(`Optimizing: ${audio.path}`)
          return optimize(audio, song).catch(err => {
            Log.e(`Optimize failed: ${audio.path}`, err)
          })
        })
      })
    })
    .return(processor)
}

function run(processor) {
  return processor.run()
}

function isOptimized(audio) {
  if (audio.mimeType === 'audio/flac') {
    return isOptimized__FLAC(audio)
  } else if (audio.mimeType === 'audio/mp3') {
    return isOptimized__MP3(audio)
  } else {
    throw new Error('Unknown audio format')
  }
}

function isOptimized__FLAC(audio) {
  return FLAC.metadata.new().then(it => {
    return FLAC.metadata.init(it, audio.path, true, false).then(() => {
      return findVorbisComment(it).then(block => {
        if (!block) return false
        const optmized = block.data.comments.find(comment => {
          return comment.includes(ID_OPTIMIZED)
        })
        if (optimized) return true
        else return false
      })
    })
  })
}

function findVorbisComment(it) {
  return FLAC.metadata.get_block_type(it).then(type => {
    if (type === FLAC.format.MetadataType['VORBIS_COMMENT']) {
      return FLAC.metadata.get_block(it)
    }
    return FLAC.metadata.next(it).then(r => {
      if (r) return findVorbisComment(it)
      return null
    })
  })
}

function isOptimized__MP3(audio) {
  return ID3v2.readAsync(audio.path).then(tags => {
    const priv = tags['private']
    if (priv instanceof Array) {
      const p = priv.find(p => {
        return p.owner === ID_OPTIMIZED
      })
      return p ? true : false
    } else {
      if (priv.owner === ID_OPTIMIZED) {
        return true
      }
      return false
    }
  })
}

function optimize(audio, song) {
  if (audio.mimeType === 'audio/flac') {
    return optimize__FLAC(audio, song)
  } else if (audio.mimeType === 'audio/mp3') {
    return optimize__MP3(audio, song)
  } else {
    throw new Error('Unknown audio format')
  }
}

function optimize_MP3(audio, song) {
  return ID3v1.removeTagsAsync(audio.path)
    .then(() => {
      return ID3v2.removeTagsAsync(audio.path)
    })
    .then(() => {
      return ID3v2.writeAsync(
        {
          title: song.name,
          artist: song.artists[0].name,
          album: 'Unknown',
          private: {
            owner: ID_OPTIMIZED,
            data: 'true'
          }
        },
        audio.path
      )
    })
}

function optimize_FLAC(audio, song) {
  return FLAC.metadata.new().then(it => {
    return FLAC.metadata.init(it, audio.path, false, false).then(() => {
      return findVorbisComment(it)
        .then(block => {
          if (block) {
            return FLAC.metadata.delete_block(it, true)
          }
        })
        .then(() => {
          return FLAC.metadata_object.new(
            FLAC.format.MetadataType['VORBIS_COMMENT']
          )
        })
        .then(block => {
          return Promise.all(
            FLAC.metadata_object.vorbiscomment_entry_from_name_value_pair(
              'Title',
              song.name
            ),
            FLAC.metadata_object.vorbiscomment_entry_from_name_value_pair(
              'Artist',
              song.artists[0].name
            ),
            FLAC.metadata_object.vorbiscomment_entry_from_name_value_pair(
              'Album',
              'Unknown'
            ),
            FLAC.metadata_object.vorbiscomment_entry_from_name_value_pair(
              ID_OPTIMIZED,
              'true'
            )
          )
            .mapSeries(entry => {
              return FLAC.metadata_object.vorbiscomment_append_comment(
                block,
                entry
              )
            })
            .return(block)
        })
        .then(block => {
          return FLAC.metadata.insert_block_after(it, block, true)
        })
    })
  })
}