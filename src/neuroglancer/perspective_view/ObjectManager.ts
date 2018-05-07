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
/*
This class is created to load 3D objects meta info like
name, description etc. It is also used to store display information
like selected objects in perspective panel.
*/
export interface BindingList {
  label: string;
  all: Set<string>;
  selected: Set<string>;
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
color: number;
}

export class ObjectManager{
  labeledData: BindingList = {
    label: '',
    all: new Set(),
    selected: new Set()
  };
  objectSource: ObjectSource;
  objects= new Map<string,BrainObject>();
  viewer:PerspectiveViewerState;
  layer: SegmentationUserLayer;
  sourceUrl: string|undefined;
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
              this.objects.set(data.name, data);
              this.labeledData.all!.add(data.name);
          }
          let layerSource=viewer.layerManager.managedLayers[0]!.layer;
          if(layerSource instanceof SegmentationUserLayer){
            for(let i=0;i<this.objects!.size;i++){
              this.layer=layerSource;
              layerSource.displayState.visibleSegments.add(new Uint64(i,0));
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

  addObject(object: BrainObject){
  if(!this.labeledData!.all.has(object.name)){
    this.labeledData!.all.add(object.name);
  }

  }
  addSelectedObject(object: string){
   this.labeledData!.selected.add(object);
  }
  removeSelectedObject(object: string){
     this.labeledData!.selected.delete(object);
    }

  getObjectNames(): Set<string>{
  //  console.log(this.labeledData!.all);
    return this.labeledData!.all;
  }

  getSelectedObjectNames(): Set<string>{
    return this.labeledData!.selected;
  }

  display(input : string){
  //  console.log(input);
    if(input==='all'){
      for(let i=0;i<this.objects!.size;i++){
         this.layer.displayState!.visibleSegments.add(new Uint64(i,0));
      }
    }
    if(input==='none'){
       this.layer.displayState!.visibleSegments.clear();
    }
    if(input==='selected'){
      let selectedIds= new Array<number>();
      for(let selectedObject of this.labeledData!.selected){
        let value=this.objects!.get(selectedObject);
        if(value!= undefined){
          selectedIds.push(value.id);
        }
      }
       this.layer.displayState!.visibleSegments.clear();
       for(let visiblesegment of selectedIds ){
         this.layer.displayState!.visibleSegments.add(new Uint64(visiblesegment,0));
       }
    //  console.log(selectedIds);
    }
  if(input==='inverted'){
    let selectedIds= new Array<number>();
    let difference = new Set<string>([... this.labeledData!.all].filter(x => !this.labeledData!.selected.has(x)));
    for(let selectedObject of difference){
      let value=this.objects!.get(selectedObject);
      if(value!= undefined){
        selectedIds.push(value.id);
      }
    }
    this.layer.displayState!.visibleSegments.clear();
    for(let visiblesegment of selectedIds ){
      this.layer.displayState!.visibleSegments.add(new Uint64(visiblesegment,0));
    }
  }
  }

  searchText(input : string){
  //console.log(input);
   let filteredSet=new Set();
   for(const item of this.labeledData!.all){
     if(item.includes(input)){
       filteredSet.add(item);
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
