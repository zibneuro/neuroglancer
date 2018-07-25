/**
 * @license
 * Copyright 2016 Google Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {PerspectiveViewerState} from 'neuroglancer/perspective_view/panel';
import {Uint64} from 'neuroglancer/util/uint64';
import {SegmentationUserLayer} from 'neuroglancer/segmentation_user_layer';
import {ManagedUserLayerWithSpecification} from 'neuroglancer/layer_specification';
import {vec4} from 'neuroglancer/util/geom';
import {hexToRgb} from 'neuroglancer/util/colorspace';
/*
This class is created to load 3D objects meta info like
name, description etc. It is also used to store display information
like selected objects in perspective panel.
*/
export interface BindingList {
  label: string;
  all: Set<number>;
  selected: Set<number>;
}

export interface BrainObject {
id:number;
name: string;
parentid: number;
region: string;
level: number;
downloadid: string;
objecttype: string;
description: string;
dataset: string;
color: string;
transparency: number;
}

export class ObjectManager{
  labeledData: BindingList = {
    label: '',
    all: new Set(),
    selected: new Set()
  };
  objectSource: ObjectSource;
  objects= new Map<number,BrainObject>();
  viewer:PerspectiveViewerState;
  layer: SegmentationUserLayer;
  sourceUrl: string|undefined;
  wholefish: boolean;
  constructor(viewer:PerspectiveViewerState) {
    this.viewer=viewer;
    // GET SOURCE URL
    if(viewer.layerManager.managedLayers[0]!=null){
      let managedLayer=viewer.layerManager.managedLayers[0];
      if(managedLayer instanceof ManagedUserLayerWithSpecification){
        this.sourceUrl=managedLayer.sourceUrl;
      }
    }
      // GET OBJECT DATA & layer Source
    if(viewer.layerManager.managedLayers[0]!.layer!=null){
      viewer.layerManager.managedLayers[0].layer!.manager.dataSourceProvider.
        get3DObject(this.sourceUrl+"/objects.json")
        .then(objectSource =>{
          for(let data of objectSource.objectList){
              this.objects.set(data.id, data);
              this.labeledData.all!.add(data.id);
          }
          let layerSource=viewer.layerManager.managedLayers[0]!.layer;
          if(layerSource instanceof SegmentationUserLayer){
            for(let key of this.objects.keys()){
              this.layer=layerSource;
              layerSource.displayState.visibleSegments.add(new Uint64(key,0));
            }
          }
        });
    }
      // GET OBJECT DATA
/*    if(viewer.layerManager.managedLayers !=null){
      //   console.log(viewer.layerManager.managedLayers[0]!.layer);
         let layerSource=viewer.layerManager.managedLayers[0]!.layer;
         if(layerSource instanceof SegmentationUserLayer){
           for(let i=0;i<this.objects!.size;i++){
             this.layer=layerSource;
             layerSource.displayState.visibleSegments.add(new Uint64(i,0));
           }
         }

     // viewer.mouseState.pickedValue= new Uint64(1, 0);
     // viewer.mouseState.triggerUpdate();
     //  viewer.layerManager.managedLayers[0].layer!.manager.layerSelectedValues=
     //this.registerDisposer(new LayerSelectedValues(viewer.layerManager, viewer.mouseState));
   }*/
  }

/*  addObject(object: BrainObject){
  if(!this.labeledData!.all.has(object.name)){
    this.labeledData!.all.add(object.name);
  }

}*/

  objectName(id:number){
    let object=this.objects!.get(id);
    return object!.name;
  }
  objectAlpha(id:number){
    let object=this.objects!.get(id);
    return object!.transparency;
  }
  setObjectAlpha(id:number, transparency:number){
    let object=this.objects!.get(id);
     object!.transparency=transparency/100;
     this.objects!.set(id, object!);
  }
  objectHexColor(id:number){
     let object=this.objects!.get(id);
   return object!.color;
  }
  setObjectHexColor(id:number, color:string){
     let object=this.objects!.get(id);
      object!.color=color;
      this.objects!.set(id, object!);
  }
  objectColor(id:Uint64){
    if(this.wholefish==true){
        let object=this.objects!.get(-1);
        if(object!=null){
        let rgb = new Float32Array(3);
        hexToRgb(rgb,object!.color);
        let color = vec4.create();
        color[0] = rgb[0]*(object.transparency/100);
        color[1] = rgb[1]*(object.transparency/100);
        color[2] = rgb[2]*(object.transparency/100);
        color[3] = object!.transparency;
        return color;
      }
    }
    let object=this.objects!.get(id.low);
    if(object!=null){
      let rgb = new Float32Array(3);
      hexToRgb(rgb,object!.color);
      let color = vec4.create();
      color[0] = rgb[0]*(object.transparency/100);
      color[1] = rgb[1]*(object.transparency/100);
      color[2] = rgb[2]*(object.transparency/100);
      color[3] = object!.transparency;
      return color;
    }
 return null;
  }
  addSelectedObject(object: number){
      //console.log(object);
    if(object ==-1){
      this.labeledData!.selected=new Set(this.labeledData!.all);
      //console.log(this.labeledData!.all);
      //console.log(this.labeledData!.selected);
      this.wholefish=true;
    }
    else{
      this.labeledData!.selected.add(object);
    }

  }
  removeSelectedObject(object: number){
    //console.log(object);
    if(object ==-1){
      this.labeledData!.selected.clear();
      this.wholefish=false;
    }
    else{
     this.labeledData!.selected.delete(object);
   }
    }

  getObjectNames(): Set<number>{
  //  console.log(this.labeledData!.all);
    return this.labeledData!.all;
  }

  getSelectedObjectNames(): Set<number>{
    return this.labeledData!.selected;
  }


  display(input : string){
  //  console.log(input);
    if(input==='all'){
      for(let key of this.objects.keys()){
         this.layer.displayState!.visibleSegments.add(new Uint64(key,0));
      }
    }
    if(input==='none'){
       this.layer.displayState!.visibleSegments.clear();
    }
    if(input==='selected'){
       this.layer.displayState!.visibleSegments.clear();
       for(let visiblesegment of  this.labeledData!.selected){
         this.layer.displayState!.visibleSegments.add(new Uint64(visiblesegment,0));
       }
    //  console.log(selectedIds);
    }
  if(input==='inverted'){
    let difference = new Set<number>([... this.labeledData!.all].filter(x => !this.labeledData!.selected.has(x)));
    this.layer.displayState!.visibleSegments.clear();
    for(let visiblesegment of difference ){
      this.layer.displayState!.visibleSegments.add(new Uint64(visiblesegment,0));
    }
  }
  }

  searchText(input : string){
  //console.log(input);
   let filteredSet=new Set();
   for(const item of this.objects!.values()){
     if(item.name.toLowerCase().includes(input.toLowerCase())){
       filteredSet.add(item.id);
     }
   }
    return filteredSet;
 }
}

export class ObjectSource {
  objectList= new Array<BrainObject>();
  constructor( obj: Array<BrainObject>) {
    //console.log(obj);
  this.objectList=obj;
  }

}
