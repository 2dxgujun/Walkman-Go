import fetch from 'node-fetch'
import HttpError from '../http-error'
import ApiError from '../api-error'
import { Log } from '../../utils/logger'

export function getPlaylists(uin) {
  return fetch(
    `https://c.y.qq.com/rsc/fcgi-bin/fcg_user_created_diss?hostuin=${uin}&size=32&format=json`,
    {
      headers: {
        referer: 'https://y.qq.com/'
      }
    }
  )
    .then(res => {
      if (res.ok) return res.json()
      return res.text().then(text => {
        throw new HttpError(res.status, text)
      })
    })
    .then(result => {
      if (result.code !== 0) {
        throw new ApiError(result.code, result.message)
      }
      return result.data.disslist.map(diss => {
        return {
          id: diss.tid,
          name: diss.diss_name,
          song_cnt: diss.song_cnt
        }
      })
    })
}

export function getPlaylistSongs(playlistId) {
  return fetch(
    `https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg?type=1&disstid=${playlistId}&utf8=1&format=json`,
    {
      headers: {
        referer: 'https://y.qq.com/'
      }
    }
  )
    .then(res => {
      if (res.ok) return res.json()
      return res.text().then(text => {
        throw new HttpError(res.status, text)
      })
    })
    .then(result => {
      if (result.code !== 0) {
        throw new ApiError(result.code, result.message)
      }
      return result.cdlist[0].songlist.map(song => {
        return {
          id: song.songid,
          mid: song.strMediaMid,
          name: song.songname,
          album: {
            id: song.albumid, // may be 0
            mid: song.albummid, // may be ''
            name: song.albumname
          },
          artists: song.singer // may be []
            .filter(singer => {
              return singer.id && singer.mid && singer.name
            })
            .map(singer => {
              return {
                id: singer.id,
                mid: singer.mid,
                name: singer.name
              }
            }),
          size128: song.size128,
          size320: song.size320,
          sizeflac: song.sizeflac
        }
      })
    })
}

export function getAlbums(uin) {
  return _getAlbums(uin).map(album => ({
    id: album.albumid,
    mid: album.albummid,
    name: album.albumname,
    artist: {
      id: album.singerid,
      mid: album.singermid,
      name: album.singername
    }
  }))
}

function _getAlbums(uin, offset = 0) {
  return fetch(
    `https://c.y.qq.com/fav/fcgi-bin/fcg_get_profile_order_asset.fcg?ct=20&cid=205360956&userid=${uin}&reqtype=2&
    sin=${offset}&ein=${offset + 49}`
  )
    .then(res => {
      if (res.ok) return res.json()
      return res.text().then(text => {
        throw new HttpError(res.status, text)
      })
    })
    .then(result => {
      if (result.code !== 0) {
        throw new ApiError(result.code, result.message)
      }
      if (result.data.has_more) {
        return _getAlbums(uin, offset + 50).then(result.concat)
      }
      return result.data.albumlist
    })
}

export function getAlbumInfo(albummid) {
  return fetch(
    `https://c.y.qq.com/v8/fcg-bin/fcg_v8_album_info_cp.fcg?albummid=${albummid}&format=json`
  )
    .then(res => {
      if (res.ok) return res.json()
      return res.text().then(text => {
        throw new HttpError(res.status, text)
      })
    })
    .then(result => {
      if (result.code !== 0) {
        throw new ApiError(result.code, result.data.albumTips)
      }
      return {
        id: result.data.id,
        mid: result.data.mid,
        name: result.data.name,
        song_cnt: result.data.total_song_num,
        release_date: result.data.aDate,
        language: result.data.lan,
        genre: result.data.genre,
        artist: {
          id: result.data.singerid,
          mid: result.data.singermid,
          name: result.data.singername
        },
        songs: result.data.list.map(song => ({
          id: song.songid,
          mid: song.strMediaMid,
          name: song.songname,
          artists: song.singer.map(singer => ({
            id: singer.id,
            mid: singer.mid,
            name: singer.name
          })),
          size128: song.size128,
          size320: song.size320,
          sizeflac: song.sizeflac
        }))
      }
    })
}

function getRemoteAudioFile(songmid, bitrate) {
  switch (bitrate) {
    case 'flac':
      return `F000${songmid}.flac`
    case '320':
      return `M800${songmid}.mp3`
    case '128':
      return `M500${songmid}.mp3`
  }
}

export function getAudioStream(songmid, bitrate) {
  const guid = Math.floor(Math.random() * 1000000000)
  return fetch(
    `https://c.y.qq.com/base/fcgi-bin/fcg_musicexpress.fcg?guid=${guid}&format=json`
  )
    .then(res => {
      if (res.ok) return res.json()
      return res.text().then(text => {
        throw new HttpError(res.status, text)
      })
    })
    .then(result => {
      // prettier-ignore
      if (songmid[0] === '1') {
        // 101JlzUt2zzxS9
        return fetch(`http://124.14.5.142/musicoc.music.tc.qq.com/${getRemoteAudioFile(songmid,bitrate)}?vkey=${result.key}&guid=${guid}&fromtag=64`)
      } else {
        return fetch(`${result.sip[0]}${getRemoteAudioFile(songmid, bitrate)}?vkey=${result.key}&guid=${guid}&fromtag=60`)
      }
    })
    .then(res => {
      if (res.ok) return res.body
      return res.text().then(text => {
        throw new HttpError(res.status, text)
      })
    })
}

export function getAlbumArtworkStream(albumid) {
  const id = albumid.toString()
  const sid = parseInt(id.substr(id.length - 2))
  return fetch(
    `https://y.gtimg.cn/music/photo/album_500/${sid}/500_albumpic_${id}_0.jpg`
  ).then(res => {
    if (res.ok) return res.body
    return res.text().then(text => {
      throw new HttpError(res.status, text)
    })
  })
}
