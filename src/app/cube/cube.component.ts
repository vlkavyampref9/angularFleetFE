import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import * as THREE from "three";
import * as CONTROLS from "three/examples/jsm/controls/OrbitControls";

//HTTP related imports
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
//import { Observable, throwError } from 'rxjs';
//import { catchError, retry } from 'rxjs/operators';


@Component({
  selector: 'app-cube',
  templateUrl: './cube.component.html',
  styleUrls: ['./cube.component.scss']
})
export class CubeComponent implements OnInit, AfterViewInit {

  @ViewChild('canvas')
  private canvasRef: ElementRef;

  //* Cube Properties

  @Input() public rotationSpeedX: number = 0.05;

  @Input() public rotationSpeedY: number = 0.01;

  @Input() public size: number = 200;

  @Input() public texture: string = "/assets/mapImage.jpg";


  //* Stage Properties

  @Input() public cameraZ: number = 1000;

  @Input() public fieldOfView: number = 1;

  @Input('nearClipping') public nearClippingPlane: number = 100;

  @Input('farClipping') public farClippingPlane: number = 10000;

  //? Helper Properties (Private Properties);

  private camera!: THREE.OrthographicCamera;
  private orbitControls!: CONTROLS.OrbitControls;
  private machineArray:Array<any> = []; //array to hold machine positions from backend
  private machineObjects: Array<THREE.Points> = [];
  private curveObjects: Array<THREE.Line> = [];
  private splineCurves: Array<THREE.SplineCurve> = [];
  

  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement;
  }
  private loader = new THREE.TextureLoader();
  private geometry = new THREE.BoxGeometry(100, 100, 10);
  private material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );

  private cube: THREE.Mesh = new THREE.Mesh(this.geometry, this.material);

  private renderer!: THREE.WebGLRenderer;

  private scene!: THREE.Scene;

  /**
   *Animate the cube
   *
   * @private
   * @memberof CubeComponent
   */
  private animate() {
  
    this.orbitControls.update();
  }

  /**
   * Create the scene
   *
   * @private
   * @memberof CubeComponent
   */
  private createScene() {
    //* Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000)
    //this.scene.add(this.cube);
    const geometry = new THREE.PlaneGeometry( 2000, 2000);
    const material = new THREE.MeshBasicMaterial({ map: this.loader.load(this.texture) });
    //new THREE.MeshBasicMaterial( {color: 0x0000AF, side: THREE.DoubleSide, wireframe: true, opacity: 0.5 } );
    const plane = new THREE.Mesh( geometry, material );
    plane.position.x = 300;
    plane.position.y = 300;
    this.scene.add( plane );

    // const gridHelper = new THREE.GridHelper(1000,10,new THREE.Color(0xF0FFFF), new THREE.Color(0x00FFFF));
    // gridHelper.position.y = 0;
		// gridHelper.position.x = 0;
    // gridHelper.position.z = 0;
    // gridHelper.rotateX(90);
    // gridHelper.rotateY(90);
    // this.scene.add(gridHelper);
    //*Camera
    let aspectRatio = this.getAspectRatio();
    // this.camera = new THREE.PerspectiveCamera(
    //   this.fieldOfView,
    //   aspectRatio,
    //   this.nearClippingPlane,
    //   this.farClippingPlane
    // )
    this.camera = new THREE.OrthographicCamera( -1000, 
    1000, 
    1000, 
    -1000, 
    300, 
    5000 );
    this.camera.position.z = this.cameraZ;
    
    
  }

  /**
   * get machine positions from server
   *
   * @private
   * @memberof CubeComponent
   */
  private getMachinePositionsFromServerAndRender(){ 
    this.machineArray = [];     
    this.http.get<any[]>('http://localhost:5000/machines').subscribe({
      next: (data) => {
        data.forEach((machine) => this.machineArray.push(machine)); 
        this.addMachinePositions(); 
    }, // success path
      error: error => console.log(error), // error path
    }      
   );
  }

  /**
   * Add machine positions
   *
   * @private
   * @memberof CubeComponent
   */

  private addMachinePositions(){
    if(this.machineObjects.length > 0){
      for(var i = 0; i < this.machineObjects.length; i++){
        
          this.machineObjects[i].geometry.attributes.position = new THREE.BufferAttribute(new Float32Array([this.machineArray[i]['posx'], this.machineArray[i]['posy'],2]), 3);
          this.scene.getObjectByName(this.machineObjects[i].name)?.matrixAutoUpdate;
          
          //add latest position to route
          // this.splineCurves[i].points.push(new THREE.Vector2(this.machineArray[i]['posx'], this.machineArray[i]['posy']));
          // const geometry = new THREE.BufferGeometry().setFromPoints( this.splineCurves[i].getPoints(20));
          // const material = new THREE.LineBasicMaterial( { color: 0x00ff00 } );          
          // const splineObject = new THREE.Line( geometry, material );  
          // this.scene.remove(this.curveObjects[i]);        
          // this.curveObjects[i] = splineObject;
          // this.scene.add(splineObject);
        }
           
      this.renderer.render(this.scene, this.camera);  
      return;          
    }
    
    if(this.machineArray.length == 0) return;
    this.buildManageMachineDotObjects();
    //this.buildManageRouteCurveObjects();      
   
  }

  private buildManageMachineDotObjects(){
    this.machineArray.forEach(machine => {
      //adding dots where cars would be
      const dotGeometry = new THREE.BufferGeometry();
      dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([machine['posx'], machine['posy'],2]), 3));
      const dotMaterial = new THREE.PointsMaterial({ size: 15, color: 0xff0000 });
      const dot = new THREE.Points(dotGeometry, dotMaterial);
      dot.name = machine['vin'];
      this.machineObjects.push(dot);
      this.scene.add(dot); 
      dot.geometry.attributes.position.needsUpdate = true; });

  }
  private buildManageRouteCurveObjects(){
    this.machineArray.forEach(machine => {
      //adding curve to trace the route of the car
    const splineCurve = new THREE.SplineCurve([new THREE.Vector2(machine['posx'], machine['posy'])]);
    const points = splineCurve.getPoints( 50 );
    this.splineCurves.push(splineCurve);
    const geometry = new THREE.BufferGeometry().setFromPoints( points );
    const material = new THREE.LineBasicMaterial( { color: 0x00ff00 } );
    // Create the final object to add to the scene
    const splineObject = new THREE.Line( geometry, material );
    splineObject.name = "route" + machine['vin'];
    this.curveObjects.push(splineObject);
    this.scene.add(splineObject);   

    });    
    
  }

  private getAspectRatio() {
    return this.canvas.clientWidth / this.canvas.clientHeight;
  }

  /**
 * Start the rendering loop
 *
 * @private
 * @memberof CubeComponent
 */
  private startRenderingLoop() {
    //* Renderer
    // Use canvas element in template
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
    this.renderer.setPixelRatio(devicePixelRatio);
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.orbitControls = new CONTROLS.OrbitControls(this.camera, this.renderer.domElement);
    setInterval(()=> { component.getMachinePositionsFromServerAndRender() }, 1000);
    

    let component: CubeComponent = this;
    (function render() {
      requestAnimationFrame(render);
      //component.getMachinePositionsFromServerAndRender(); 
      component.animate();            
      component.renderer.render(component.scene, component.camera);
    }());
  }

  constructor(private http: HttpClient) { }

  ngOnInit(): void {   
   
  }

  ngAfterViewInit() {
    this.createScene();  
    this.getMachinePositionsFromServerAndRender(); 
    this.startRenderingLoop();

  }

}
