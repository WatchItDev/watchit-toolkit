// const expectIndexFile = path.join(output, "index.m3u8");
  
  
//   if (!fs.existsSync(expectIndexFile)) {
//     console.log(`Processing ${imdb}`);
//     continue;
//   }

//   const newPath = path.join(output, "hls");
//   if (!fs.existsSync(newPath)) fs.mkdirSync(newPath);
//   console.log(`Found ${imdb}`);

//   try {
//     fs.cpSync(path.join(output, "1080p"), path.join(newPath, "1080p"), {
//       recursive: true,
//       force: false,
//     });
//   } catch (err) {}
//   try {
//     fs.cpSync(path.join(output, "720p"), path.join(newPath, "720p"), {
//       recursive: true,
//       force: false,
//     });
//   } catch (err) {}
//   try {
//     fs.cpSync(path.join(output, "480p"), path.join(newPath, "480p"), {
//       recursive: true,
//       force: false,
//     });
//   } catch (err) {}

//   fs.cpSync(path.join(output, "index.m3u8"), path.join(newPath, "index.m3u8"));

//   fs.rmSync(path.join(output, "index.m3u8"), { recursive: true, force: true });
//   fs.rmSync(path.join(output, "1080p"), { recursive: true, force: true });
//   fs.rmSync(path.join(output, "720p"), { recursive: true, force: true });
//   fs.rmSync(path.join(output, "480p"), { recursive: true, force: true });