
import {Overlay} from 'neuroglancer/overlay';
//import {DataSourceProvider} from 'neuroglancer/datasource';
//import {writeFile} from 'fs';
//import {Borrowed} from 'neuroglancer/util/disposable';
require('neuroglancer/noselect.css');
require('./createproject.css');
export class CreateProject extends Overlay {
    //dataSourceProvider: Borrowed<DataSourceProvider>;

     constructor(){
       super();
      // this.dataSourceProvider=dataSource;
       let {content} = this;
      content.classList.add('create-project');
       let projectLabel = document.createElement('h2');
       projectLabel.textContent = 'Create Project';
       content.appendChild(projectLabel);
       let projectName = document.createElement("input");
       projectName.type = "text";
       projectName.className = "input";
       projectName.placeholder = "Project Name...";
       content.appendChild(projectName);
       let typeList = ["IMAGE", "SEGMENTATION"];
       let selectList = document.createElement("select");
       selectList.id = "type";
       selectList.className ="select";
       for(let type of typeList){
         let option = document.createElement("option");
             option.value = type;
             option.text = type;
             selectList.appendChild(option);
       }
       content.appendChild(selectList);
       content.appendChild(document.createElement("br"));
       let dataType = ["uint8", "uint16", "uint32", "uint64", "float32"];
       let dataTypeList = document.createElement("select");
       dataTypeList.id = "datatype";
       dataTypeList.className ="select";
       for(let type of dataType){
         let option = document.createElement("option");
             option.value = type;
             option.text = type;
             dataTypeList.appendChild(option);
       }
       content.appendChild(dataTypeList);

       content.appendChild(document.createElement("br"));
       let createButton = document.createElement("button");
       createButton.className = 'button';
       createButton.textContent = 'Create';
       createButton.value = 'create';
       this.registerEventListener(createButton, 'click', () => {
       console.log(projectName.value);
         });
       content.appendChild(createButton);


     }
}
