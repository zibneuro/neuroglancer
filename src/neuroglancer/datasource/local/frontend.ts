
//import {readFile} from 'fs';
import {AnnotationSource, makeDataBoundsBoundingBox} from 'neuroglancer/annotation';
import {DataSource} from 'neuroglancer/datasource';
import {MeshSourceParameters, VolumeChunkEncoding, VolumeChunkSourceParameters} from 'neuroglancer/datasource/local/base';
import {MeshSource} from 'neuroglancer/mesh/frontend';
import {ObjectSource} from 'neuroglancer/perspective_view/ObjectManager';
import {DataType, VolumeChunkSpecification, VolumeSourceOptions, VolumeType} from 'neuroglancer/sliceview/volume/base';
import {MultiscaleVolumeChunkSource as GenericMultiscaleVolumeChunkSource, VolumeChunkSource} from 'neuroglancer/sliceview/volume/frontend';
import {mat4, vec3} from 'neuroglancer/util/geom';
import {ChunkManager,WithParameters} from 'neuroglancer/chunk_manager/frontend';
import {openShardedHttpRequest,parseSpecialUrl,sendHttpRequest} from 'neuroglancer/util/http_request';
import {parseArray, parseFixedLengthArray, parseIntVec, verifyEnumString, verifyFinitePositiveFloat, verifyObject, verifyObjectProperty, verifyOptionalString, verifyPositiveInt, verifyString} from 'neuroglancer/util/json';


class LocalVolumeChunkSource extends
(WithParameters(VolumeChunkSource, VolumeChunkSourceParameters)) {}

class LocalMeshSource extends
(WithParameters(MeshSource, MeshSourceParameters)) {}


class ScaleInfo {
  key: string;
  encoding: VolumeChunkEncoding;
  resolution: vec3;
  voxelOffset: vec3;
  size: vec3;
  chunkSizes: vec3[];
  compressedSegmentationBlockSize: vec3|undefined;
  constructor(obj: any) {
    verifyObject(obj);
    this.resolution = verifyObjectProperty(
        obj, 'resolution', x => parseFixedLengthArray(vec3.create(), x, verifyFinitePositiveFloat));
    this.voxelOffset =
        verifyObjectProperty(obj, 'voxel_offset', x => parseIntVec(vec3.create(), x)),
    this.size = verifyObjectProperty(
        obj, 'size', x => parseFixedLengthArray(vec3.create(), x, verifyPositiveInt));
    this.chunkSizes = verifyObjectProperty(
        obj, 'chunk_sizes',
        x => parseArray(x, y => parseFixedLengthArray(vec3.create(), y, verifyPositiveInt)));
    if (this.chunkSizes.length === 0) {
      throw new Error('No chunk sizes specified.');
    }
    let encoding = this.encoding =
        verifyObjectProperty(obj, 'encoding', x => verifyEnumString(x, VolumeChunkEncoding));
    if (encoding === VolumeChunkEncoding.COMPRESSED_SEGMENTATION) {
      this.compressedSegmentationBlockSize = verifyObjectProperty(
          obj, 'compressed_segmentation_block_size',
          x => parseFixedLengthArray(vec3.create(), x, verifyPositiveInt));
    }
    this.key = verifyObjectProperty(obj, 'key', verifyString);
  }
}



export class MultiscaleVolumeChunkSource implements GenericMultiscaleVolumeChunkSource {
  dataType: DataType;
  numChannels: number;
  volumeType: VolumeType;
  mesh: string|undefined;
  scales: ScaleInfo[];

  getMeshSource() {
    let {mesh} = this;
    if (mesh === undefined) {
      return null;
    }
    return getShardedMeshSource(
        this.chunkManager, {baseUrls: this.baseUrls, path: `${this.path}/${mesh}`, lod: 0});
  }

  constructor(
      public chunkManager: ChunkManager, public baseUrls: string[], public path: string, obj: any) {
    console.log(obj);
    verifyObject(obj);
    this.dataType = verifyObjectProperty(obj, 'data_type', x => verifyEnumString(x, DataType));
    this.numChannels = verifyObjectProperty(obj, 'num_channels', verifyPositiveInt);
    this.volumeType = verifyObjectProperty(obj, 'type', x => verifyEnumString(x, VolumeType));
    this.mesh = verifyObjectProperty(obj, 'mesh', verifyOptionalString);
    this.scales = verifyObjectProperty(obj, 'scales', x => parseArray(x, y => new ScaleInfo(y)));
  }

  getSources(volumeSourceOptions: VolumeSourceOptions) {
    return this.scales.map(scaleInfo => {
      return VolumeChunkSpecification
          .getDefaults({
            voxelSize: scaleInfo.resolution,
            dataType: this.dataType,
            numChannels: this.numChannels,
            transform: mat4.fromTranslation(
                mat4.create(),
                vec3.multiply(vec3.create(), scaleInfo.resolution, scaleInfo.voxelOffset)),
            upperVoxelBound: scaleInfo.size,
            volumeType: this.volumeType,
            chunkDataSizes: scaleInfo.chunkSizes,
            baseVoxelOffset: scaleInfo.voxelOffset,
            compressedSegmentationBlockSize: scaleInfo.compressedSegmentationBlockSize,
            volumeSourceOptions,
          })
          .map(spec => this.chunkManager.getChunkSource(LocalVolumeChunkSource, {
            spec,
            parameters: {
              'baseUrls': this.baseUrls,
              'path': `${this.path}/${scaleInfo.key}`,
              'encoding': scaleInfo.encoding
            }
          }));
    });
  }

  getStaticAnnotations() {
    const baseScale = this.scales[0];
    const annotationSet =
      new AnnotationSource(mat4.fromScaling(mat4.create(), baseScale.resolution));
    annotationSet.readonly = true;
    annotationSet.add(makeDataBoundsBoundingBox(
        baseScale.voxelOffset, vec3.add(vec3.create(), baseScale.voxelOffset, baseScale.size)));
    return annotationSet;
  }
}


export function getShardedMeshSource(chunkManager: ChunkManager, parameters: MeshSourceParameters) {
  return chunkManager.getChunkSource(LocalMeshSource, {parameters});
}

/*export function sendlocalRequest(baseUrls: string[], path: string, type: string): Promise<any>{
  let url = pickShard(baseUrls, path);
  let finalurl=url+'.'+type;
  console.log(finalurl);
  return new Promise((resolve, reject) => {

   });
}

export function sendHttpRequest(
    xhr: XMLHttpRequest, responseType: XMLHttpRequestResponseType) {
  xhr.responseType = responseType;
  return new Promise((resolve, reject) => {
    xhr.onreadystatechange = function(this: XMLHttpRequest) {
      let status = this.status;
      let readyState = this.readyState;
      if (status >= 200 && readyState == 4) {
        console.log(this.response);
        resolve(this.response);
      } else {
        reject(HttpError.fromXhr(xhr));
      }
    };
    xhr.send();
  });
}*/
export function getShardedVolume(chunkManager: ChunkManager, baseUrls: string[], path: string) {
  //sendlocalRequest(["C:/Users/sumit/Documents/MZFDATA/neuroglancer"],'/info', 'json').then( data =>console.log(data));
  return chunkManager.memoize.getUncounted(
      {'type': 'local:MultiscaleVolumeChunkSource', baseUrls, path},
      () => sendHttpRequest(openShardedHttpRequest(baseUrls, path + '/info.json'), 'json')
      .then(
          response =>
        new MultiscaleVolumeChunkSource(chunkManager, baseUrls, path, response)));
}

export function getMeshSource(chunkManager: ChunkManager, url: string) {
  const [baseUrls, path] = parseSpecialUrl(url);
  console.log(baseUrls);
  console.log(path);
  return getShardedMeshSource(chunkManager, {baseUrls, path, lod: 0});
}

export function getVolume(chunkManager: ChunkManager, url: string) {
  const [baseUrls, path] = parseSpecialUrl(url);
  return getShardedVolume(chunkManager, baseUrls, path);
}
export class LocalDataSource extends DataSource {
  get description() {
    return 'Local';
  }
  getVolume(chunkManager: ChunkManager, url: string) {
   return getVolume(chunkManager, url);
  }
  getMeshSource(chunkManager: ChunkManager, url: string) {
  return getMeshSource(chunkManager, url);
  }

  get3DObject(url: string){
    const [baseUrls, path] = parseSpecialUrl(url);
    return sendHttpRequest(openShardedHttpRequest(baseUrls, path), 'json')
    .then(response => new ObjectSource(response));
  }
}
