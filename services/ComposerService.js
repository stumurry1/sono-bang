const db = require("../db/models");

var amazonService = require("./AmazonService");

var composerUtil = require("../utils/ComposerUtil");

var mm = require("musicmetadata");
var NodeID3 = require("node-id3")

// needed for pipe() or Readable Streams.
// MusicMetaData doesn't know how to handle streams made by express-fileuploader
var ns = require("streamifier");

const Op = db.Sequelize.Op;

module.exports = {
  // Testing purposes only.
  Disconnect: function() {
    console.log("Closing connection...");
    return db.sequelize.close();
  },

  // Complete Unit Tests Here:

  CreateComposer: async composer => {
    var user = await db.users.create({
      name: composer.name,
      username: composer.username,
      password: composer.password,
      email: composer.email
    });

    var c = {
      name: composer.name,
      description: composer.description,
      user_id: user.id,
      homepage: composer.homepage
    };

    var composer = await db.composers.create(c);
    return {
      composer: composer,
      user: user
    };
  },

  GetComposer: async (username, password) => {
    var user = await db.users.findOne({
      where: { username: username, password: password }
    });

    var composer = null;
    if (user) {
      composer = await db.composers.findOne({ where: { user_id: user.id } });
    }

    return {
      composer: composer,
      user: user
    };
  },

  ListPlayLists: async function(composer) {
    return await db.playlists.findAll({ where: { composer_id: composer.id } });
  },

  CreatePlayList: async function(composer, playlist) {
    playlist.composer_id = composer.id;
    return await db.playlists.create(playlist);
  },

  AddSongToPlaylist : async function(song, playlist) {
      await db.playlistsongs.create({ song_id : song.id, playlist_id : playlist.id });
  },

  AddSongToComposer: async function(song, file) {
    // As we are uploading data to S3, read the file info and duration.

    console.log("uploading file");

    // Take song uploaded by web form and send it AWS S3
    var resp = await amazonService.UploadFile(song, file);

    // console.log("creating file");
    var songResponse = await db.songs.create(song);

    // console.log("finished");

    return songResponse;
  },

  ListSongsByComposer: async composer => {
    return await db.songs.findAll({ where: { composer_id: composer.id } });
  },

  ListSongsInPlayList: async function(playlist) {
    // fix this query by optimizing it when we have more time.
    var l = await db.playlistsongs.findAll({ where: { playlist_id: playlist.id } });
    var songIds = l.map(pls => pls.song_id);
    return await db.songs.findAll({ where: { id: { [Op.in] : songIds } } });
  },
  RemoveComposer: async function(composer) {
    var songs = await db.songs.findAll({where : { composer_id : composer.id }});
    console.log(songs);
    for (var i in songs) {
      var s = songs[i];
      console.log(s);
      try {
        await amazonService.DeleteFile(s.bucket, s.key);
      } catch(ex) {
        console.log('unable to delete aws resource: ' + s.key);
        console.log(ex);
      }
    }
    var user = await db.users.findById(composer.user_id);
    // remove composer first before removing user otherwise a foreign key constraint error will occur.
    // composer table foreign keys are `cascade on delete`, so playlists and songs joined to them will also be deleted automatically.
    await composer.destroy();

    await user.destroy();
  },
  RemovePlaylist: async function(playlist) {
    return await playlist.destroy();
  },
  RemoveSong: async song => {
    var song = await db.songs.findById(song.id);
    var resp = await amazonService.DeleteFile(song.bucket, song.key);
    return await song.destroy();
  },
  RemoveSongFromPlaylist : async function(song, playlist) {
    var pls = await db.playlistsongs.findAll({ where : { playlist_id: playlist.id, song_id: song.id }});
    pls.forEach(async pp => await pp.destroy());
  },
  UpdatePayment: async composer => {
    console.log("UpdatePayment");
    var composer = await db.composers.findById(composer.id);
    // console.log(composer);
    // composer.ispaid = true;

    // console.log("updating composer");
    composer = await composer.update({ ispaid: true });
    // console.log(composer);

    // console.log("findone");
    var user = db.users.findById(composer.user_id);
    // console.log(user);

    return composerUtil.encrypt({
      user: user["dataValues"],
      composer: composer["dataValues"]
    });
  },
  ListPlaylistReferencesBySong: async (song) => {
    return await db.playlistsongs.findAll({ where : { 'song_id' : song.id }});
  },
  ListPlaylistReferencesByPlaylist: async (playlist) => {
    return await db.playlistsongs.findAll({ where : { 'playlist_id' : playlist.id }});
  }
};
