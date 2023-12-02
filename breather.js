var gl;
var program;

var pointsArray = [];
var points = [];

var fColor;

var near = -20;
var far = 20;
var radius = 6.0;
var theta  = 0.0;
var phi    = 0.0;
var dr = 1.0 * Math.PI/180.0;

const black = vec4(0.0, 0.0, 1.0, 1.0);
const red = vec4(1.0, 0.0, 0.0, 1.0);

const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

var left = -11.0;
var right = 11.0;
var ytop = 11.0;
var bottom = -11.0;

var fixedDist = 11.0;
var torusRadius = 0.5;

var normalsArray = [];
var modeViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;
var normalMatrix, normalMatrixLoc;

var LX = 10.0;
var LY = 0.0;
var LZ = 0.0;

var lightPosition = vec4(LX, LY, LZ, 1.0 );
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 0.7, 0.7, 0.7, 1.0 );
var lightSpecular = vec4( 0.5, 0.5, 0.5, 1.0 );

var materialAmbient = vec4( 0.0, 0.0, 0.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialShininess = 80.0;

var ambientProduct; 
var diffuseProduct; 
var specularProduct;
var modelViewMatrix; 

var ambientColor, diffuseColor, specularColor;
var shading = 1;
var nBuffer;
var phongNormalsArr = [];
var pointsHor = [];

var qValue = 5;
var pValue = 3;
var zCoeff = 0.35;
var zSin = 10;
var torusSize = 4;
var param1 = 0.5; // 0.5 inner curve
var param2 = 0.75; // 0.75 outer curve 

var texSize = 256;

var image1 = new Array()
    for (var i =0; i<texSize; i++)  image1[i] = new Array();
    for (var i =0; i<texSize; i++) 
        for ( var j = 0; j < texSize; j++) 
           image1[i][j] = new Float32Array(4);
    for (var i =0; i<texSize; i++) for (var j=0; j<texSize; j++) {
        var c = (((i & 0x8) == 0) ^ ((j & 0x8)  == 0));
        image1[i][j] = [c, c, c, 1];
    }

var image2 = new Uint8Array(4*texSize*texSize);
    for ( var i = 0; i < texSize; i++ ) 
        for ( var j = 0; j < texSize; j++ ) 
           for(var k =0; k<4; k++) 
                image2[4*texSize*i+4*j+k] = 255*image1[i][j][k];


     
var texCoordsArray = [];
var texCoord = [
    vec2(0, 0),
    vec2(0.25, 0),
    vec2(0.25, 0.25),
    vec2(0, 0.25)
];
var tangent = vec3(1.0, 0.0, 0.0);
        
function configureTexture( image ) {
    texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, texSize, texSize, 0, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, 
                      gl.NEAREST_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}

function quad(  a,  b,  c,  d ) {
    pointsArray.push(a); 
    pointsArray.push(b); 
    pointsArray.push(c);
    pointsArray.push(a); 
    pointsArray.push(c); 
    pointsArray.push(d); 

    var t1 = subtract(b, a);
    var t2 = subtract(c, a);
    var normal = normalize(cross(t2, t1));
    normal = vec4(normal);
    normalsArray.push(normal);
    normalsArray.push(normal);
    normalsArray.push(normal);
    t1 = subtract(c, a);
    t2 = subtract(d, a);
    normal = normalize(cross(t2, t1));
    normal = vec4(normal);
    normalsArray.push(normal);
    normalsArray.push(normal);
    normalsArray.push(normal);

    phongNormalsArr.push(vec4(a[0],a[1], a[2], 0.0));
    phongNormalsArr.push(vec4(b[0],b[1], b[2], 0.0));
    phongNormalsArr.push(vec4(c[0],c[1], c[2], 0.0));
    phongNormalsArr.push(vec4(a[0],a[1], a[2], 0.0));
    phongNormalsArr.push(vec4(c[0],c[1], c[2], 0.0));
    phongNormalsArr.push(vec4(d[0],d[1], d[2], 0.0));

    texCoordsArray.push(texCoord[0]);
    texCoordsArray.push(texCoord[1]);
    texCoordsArray.push(texCoord[2]);
    texCoordsArray.push(texCoord[0]);
    texCoordsArray.push(texCoord[2]);
    texCoordsArray.push(texCoord[3]);
}

function handleRBChange(src){
    shading = src.id;
    console.log(shading);
    if(shading == 2){
        program = chooseProgram("vertex-shader-gouraud", "fragment-shader-gouraud");
        gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
        gl.bufferData( gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW );
    }
    else if(shading == 3){
        program = chooseProgram("vertex-shader-phong", "fragment-shader-phong");
        gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
        gl.bufferData( gl.ARRAY_BUFFER, flatten(phongNormalsArr), gl.STATIC_DRAW );
    }
}

window.onload = function init()
{
    var canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    

    gl.enable(gl.DEPTH_TEST);
    //gl.enable(gl.BLEND);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 2.0);

    calculateBreatherSurface();

    ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);
    modelViewMatrix = mat4();

    program = chooseProgram("vertex-shader-gouraud", "fragment-shader-gouraud" );

   
// buttons for moving viewer and changing size
    //aa-slider
    document.getElementById("aa-slider").onchange = function() {
        var val = event.srcElement.value;
        qValue = val;
        refreshBreatherSurface();
    };
    //u-slider
    document.getElementById("u-range-slider").onchange = function() {
        var val = event.srcElement.value;
        pValue = val;
        refreshBreatherSurface();
    };
   
    document.getElementById("zoom-slider").onchange = function() {
        var val = event.srcElement.value;
        left = -val * fixedDist;
        right = val * fixedDist;
        ytop = val * fixedDist;
        bottom = -val * fixedDist;
        console.log(left + " " +right+ " " +ytop + " " + bottom);
    };

 

    render();
}


function render()
{
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    eye = vec3(radius*Math.sin(phi), radius*Math.sin(theta), 
    radius*Math.cos(phi));
    
    modelViewMatrix = lookAt( eye, at, up );
    projectionMatrix = ortho( left, right, bottom, ytop, near, far );
    
    normalMatrix = [
        vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
        vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
        vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2])
    ];

    gl.uniformMatrix4fv( modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix) );
    gl.uniformMatrix3fv( normalMatrixLoc, false, flatten(normalMatrix) );
    
    if(shading == 1){
        gl.uniform4fv(fColor, flatten(red));
        gl.drawArrays( gl.LINE_LOOP, 360*12*6 , 360*12 + 360*12 );
    }else{
        gl.uniform4fv(fColor, flatten(black));
        gl.drawArrays( gl.TRIANGLES, 0, 360*12*6 );
    }
    requestAnimFrame(render);
}

function chooseProgram(vertexShad, fragShad){
    program = initShaders( gl, vertexShad, fragShad );
    gl.useProgram( program );

    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray.concat(points.concat(pointsHor))), gl.STATIC_DRAW);
    
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );
    
    nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(phongNormalsArr), gl.STATIC_DRAW );

    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal);

    fColor = gl.getUniformLocation(program, "vColor");

    var tBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);

    var vTexCoord = gl.getAttribLocation( program, "vTexCoord");
    gl.vertexAttribPointer( vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    configureTexture(image2);
 
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );

    gl.uniform4fv( gl.getUniformLocation(program, 
        "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
        "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
        "specularProduct"),flatten(specularProduct) );	
    gl.uniform4fv( gl.getUniformLocation(program, 
        "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
        "shininess"),materialShininess );

    gl.uniform3fv( gl.getUniformLocation(program, "objTangent"),flatten(tangent));   
    render();
    return program;
}

function calculateBreatherSurface(){
    var prev_arr = Array.from(Array(360), () => Array(360).fill(0));
    var aa = 0.9; // for example
    for(var u=0; u<360; u+=1) {
        for(var v = 0; v < 360; v+=30){
            var w = Math.sqrt(1 - aa * aa);
            var denom = aa * (Math.pow(w * Math.cosh(aa * u), 2) + Math.pow(aa * Math.sin(w * v), 2));

            var x = -u + (2 * (1 - aa * aa) * Math.cosh(aa * u) * Math.sinh(aa * u)) / denom;
            var y = (2 * w * Math.cosh(aa * u) * (-w * Math.cos(v) * Math.cos(w * v) - Math.sin(v) * Math.sin(w * v))) / denom;
            var z = (2 * w * Math.cosh(aa * u) * (-w * Math.sin(v) * Math.cos(w * v) + Math.cos(v) * Math.sin(w * v))) / denom;

            prev_arr[u][v] = vec4(x, y, z, 1.0);
            points.push( vec4(x, y, z, 1.0)); 
        } 
    }
    for(var i=0; i<360; i+=1) {
        for(var j = 0; j < 360; j+=30){
            quad(prev_arr[i][j], prev_arr[i][(j+30)%360], prev_arr[(i+1)%360][(j+30)%360], prev_arr[(i+1)%360][j]);
        } 
    }
    for(var j=0; j<360; j += 30) {
        for(var i = 0; i < 360; i ++){
            pointsHor.push(prev_arr[i][j]);
        } 
    }
}

function refreshBreatherSurface(){
    clearArrays();
    calculateBreatherSurface();
    if(shading == 2){
        program = chooseProgram("vertex-shader-gouraud", "fragment-shader-gouraud");
        gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
        gl.bufferData( gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW );
    }
    else{
        program = chooseProgram("vertex-shader-phong", "fragment-shader-phong");
        gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer);
        gl.bufferData( gl.ARRAY_BUFFER, flatten(phongNormalsArr), gl.STATIC_DRAW );
    }
}

function clearArrays(){
    points = [];
    pointsHor = [];
    pointsArray = [];
    normalsArray = [];
    phongNormalsArr = [];
    texCoordsArray = [];
}