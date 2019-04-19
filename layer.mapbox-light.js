const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const request = require('request');
const ProgressBar = require('ascii-progress');

const output = './mapbox-light-vector';
// 图层
const zooms = [13, 14, 15, 16, 17, 18];
processLatlng(31.425660159174594, 120.41468698052404, 31.198154567073484, 120.7648488879204, zooms, output);

/**
 *
 * @param {*} lat1 左上纬度
 * @param {*} lng1 左上经度
 * @param {*} lat2 右下纬度
 * @param {*} lng2 右下经度
 * @param {*} zooms 图层
 * @param {*} output 目录
 */
function processLatlng(lat1, lng1, lat2, lng2, zooms, output) {
  console.log(
    `[${lng1}, ${lat1}]~[${lng2}, ${lat2}] ${path.join(__dirname, output)}`
  );

  zooms.forEach(async zoom => {
    const [left, top] = latlng2tilenum(lat1, lng1, zoom);
    const [right, bottom] = latlng2tilenum(lat2, lng2, zoom);
    const isExist = await dirExists(output);
    if (!isExist) {
      await promisify(fs.mkdir)(output);
    }

    const zoomDir = `${output}/${zoom}`;
    const isZoomDirExist = await dirExists(zoomDir);
    if (!isZoomDirExist) {
      await promisify(fs.mkdir)(zoomDir);
    }

    const total = (bottom - top + 1) * (bottom - top + 1);
    const bar = new ProgressBar({
      schema: ` [:bar.cyan] :current/:total :percent :elapseds :etas layer${zoom}`,
      total
    });

    for (let i = 0; i <= right - left; i++) {
      const xDir = `${zoomDir}/${left + i}`;
      const isXDirExist = await dirExists(xDir);
      if (!isXDirExist) {
        await promisify(fs.mkdir)(xDir);
      }

      for (let j = 0; j <= bottom - top; j++) {
        const img = `${xDir}/${top + j}.png`;
        const isFileExist = await fileExists(img);
        if (!isFileExist) {
          await download(left + i, top + j, zoom, img);
        }
        bar.tick();
      }
    }
  });
}

/**
 * 根据经纬度计算xy
 * @param {*} lat 纬度
 * @param {*} lng 经度
 * @param {*} zoom 图层
 */
function latlng2tilenum(lat, lng, zoom) {
  // http://www.cnblogs.com/Tangf/archive/2012/04/07/2435545.html
  const n = Math.pow(2, zoom);
  const xtile = ((lng + 180) / 360) * n;
  const lat_rad = (lat / 180) * Math.PI;
  const ytile =
    ((1 - Math.log(Math.tan(lat_rad) + 1 / Math.cos(lat_rad)) / Math.PI) / 2) *
    n;
  return [Math.floor(xtile), Math.floor(ytile)];
}

/**
 * 判断目录是否存在
 * @param {*} pathLike
 */
async function dirExists(pathLike) {
  try {
    const stat = await promisify(fs.stat)(pathLike);
    return stat.isDirectory();
  } catch (err) {
    return false;
  }
}

/**
 * 判断文件是否存在
 * @param {*} pathLike
 */
async function fileExists(pathLike) {
  try {
    const stat = await promisify(fs.stat)(pathLike);
    return stat.isFile();
  } catch (err) {
    return false;
  }
}

/**
 *
 * @param {*} x
 * @param {*} y
 * @param {*} z 图层
 */
function download(x, y, z, img) {
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(img);
    writeStream.on('finish', () => {
      resolve();
    });
    request
      .get(
        `https://api.mapbox.com/styles/v1/mapbox/light-v9/tiles/${z}/${x}/${y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw`
      )
      .pipe(writeStream);
  });
}
