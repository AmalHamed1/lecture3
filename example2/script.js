import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124.0/build/three.module.js'
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.124.0/examples/jsm/controls/OrbitControls.js'
import { Rhino3dmLoader } from 'https://cdn.jsdelivr.net/npm/three@0.124.0/examples/jsm/loaders/3DMLoader.js'
import rhino3dm from 'https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/rhino3dm.module.js'
import { RhinoCompute } from 'https://cdn.jsdelivr.net/npm/compute-rhino3d@0.13.0-beta/compute.rhino3d.module.js'

// reference the definition
const definitionName = 'MoonDome.gh'

// listen for slider change events
const radius_slider = document.getElementById( 'radius' )
radius_slider.addEventListener( 'input', onSliderChange, false )
const offset_slider = document.getElementById( 'offset' )
offset_slider.addEventListener( 'input', onSliderChange, false )
const toolpath_slider = document.getElementById( 'toolpath' )
toolpath_slider.addEventListener( 'input', onSliderChange, false )
const piperadius_slider = document.getElementById( 'piperadius' )
piperadius_slider.addEventListener( 'input', onSliderChange, false )
const step_slider = document.getElementById( 'step' )
step_slider.addEventListener( 'input', onSliderChange, false )
const count_slider = document.getElementById( 'count' )
count_slider.addEventListener( 'input', onSliderChange, false )
const rotation_slider = document.getElementById( 'rotation' )
rotation_slider.addEventListener( 'input', onSliderChange, false )

const downloadButton = document.getElementById("downloadButton")
downloadButton.onclick = download

// set up loader for converting the results to threejs
const loader = new Rhino3dmLoader()
loader.setLibraryPath( 'https://cdn.jsdelivr.net/npm/rhino3dm@0.15.0-beta/' )

// create a few variables to store a reference to the rhino3dm library and to the loaded definition
let rhino, definition, doc

rhino3dm().then(async m => {
    rhino = m

    // local 
    //RhinoCompute.url = 'http://localhost:8081/' // Rhino.Compute server url

    // remote
    RhinoCompute.url = 'https://macad2021.compute.rhino3d.com/'
    RhinoCompute.apiKey = getApiKey() // needed when calling a remote RhinoCompute server

    // source a .gh/.ghx file in the same directory
    let url = definitionName
    let res = await fetch(url)
    let buffer = await res.arrayBuffer()
    definition = new Uint8Array(buffer)

    init()
    compute()
    animate()
})

async function compute() {

    // collect data

    // get slider values
    let radius = document.getElementById('radius').valueAsNumber
    let offset = document.getElementById('offset').valueAsNumber
    let path = document.getElementById('path').valueAsNumber
    let piperadius = document.getElementById('piperadius').valueAsNumber
    let step = document.getElementById('step').valueAsNumber
    let count = document.getElementById('count').valueAsNumber
    let rotation = document.getElementById('rotation').valueAsNumber
    
    // format data
    let param1 = new RhinoCompute.Grasshopper.DataTree('RH_IN:radius')
    param1.append([0], [radius])
    let param2 = new RhinoCompute.Grasshopper.DataTree('RH_IN:offset')
    param2.append([0], [offset])
    let param3 = new RhinoCompute.Grasshopper.DataTree('RH_IN:path')
    param3.append([0], [path])
    let param4 = new RhinoCompute.Grasshopper.DataTree('RH_IN:piperadius')
    param4.append([0], [piperadius])
    let param5 = new RhinoCompute.Grasshopper.DataTree('RH_IN:step')
    param5.append([0], [step])
    let param6 = new RhinoCompute.Grasshopper.DataTree('RH_IN:count')
    param6.append([0], [count])
    let param7 = new RhinoCompute.Grasshopper.DataTree('RH_IN:rotation')
    param7.append([0], [rotation])

    // Add all params to an array
    let transform = []
    transform.push(param1)
    transform.push(param2)
    transform.push(param3)
    transform.push(param4)
    transform.push(param5)
    transform.push(param6)
    transform.push(param7)

    // Call RhinoCompute

    const res = await RhinoCompute.Grasshopper.evaluateDefinition(definition, transform)

    console.log(res) 

    collectResults(res.values)

}

function collectResults(values) {

    // clear doc
    if( doc !== undefined)
        doc.delete()

    // clear objects from scene
    scene.traverse(child => {
        if (!child.isLight) {
            scene.remove(child)
        }
    })

    console.log(values)
    doc = new rhino.File3dm()

    for ( let i = 0; i < values.length; i ++ ) {

        const list = values[i].InnerTree['{ 0; }']

        for( let j = 0; j < list.length; j ++) {

            const data = JSON.parse(values[i].InnerTree['{ 0; }'][j].data)
            const rhinoObject = rhino.CommonObject.decode(data)
            doc.objects().add(rhinoObject, null)

        }

    }

    const buffer = new Uint8Array(doc.toByteArray()).buffer
    loader.parse( buffer, function ( object ) 
    {
        scene.add( object )
        // hide spinner
        document.getElementById('loader').style.display = 'none'

        // enable download button
        downloadButton.disabled = false
    })


}

function onSliderChange() {

    // show spinner
    document.getElementById('loader').style.display = 'block'

    // disable download button
    downloadButton.disabled = true

    compute()

}

function getApiKey() {
    let auth = null
    auth = localStorage['compute_api_key']
    if (auth == null) {
        auth = window.prompt('RhinoCompute Server API Key')
        if (auth != null) {
            localStorage.setItem('compute_api_key', auth)
        }
    }
    return auth
}

// download button handler
function download () {
    let buffer = doc.toByteArray()
    saveByteArray("node.3dm", buffer)
}

function saveByteArray ( fileName, byte ) {
    let blob = new Blob([byte], {type: "application/octect-stream"})
    let link = document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.download = fileName
    link.click()
}

// BOILERPLATE //
// declare variables to store scene, camera, and renderer
let scene, camera, renderer

function init() {

    // create a scene and a camera
    scene = new THREE.Scene()
    scene.background = new THREE.Color(1, 1, 1)
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    camera.position.z = - 30

    // create the renderer and add it to the html
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(renderer.domElement)

    // add some controls to orbit the camera
    const controls = new OrbitControls(camera, renderer.domElement)

    // add a directional light
    const directionalLight = new THREE.DirectionalLight( 0xffffff )
    directionalLight.intensity = 2
    scene.add( directionalLight )

    const ambientLight = new THREE.AmbientLight()
    scene.add( ambientLight )

}

// function to continuously render the scene
function animate() {

    requestAnimationFrame(animate)
    renderer.render(scene, camera)

}
