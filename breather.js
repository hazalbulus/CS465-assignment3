let canvas;
let gl;
let program;
const cameraSpeed = 2;
let wireMode = 0;
let magnitude = 0.5;
let mesh;
let aa = 0.5;
let uValue = 14; // Single value for u, controlled by a slider
let vValue = 37.4; // Single value for v, controlled by a slider
let vMin = -14,
  vMax = 14;
let uMin = -37.4,
  uMax = 37.4;

var theta = 0.0;
var phi = 0.0;

var cubemapTexture;

const line_count = 70;
let radius = 160;
let xRot = 110;
let yRot = 180;
let zRot = 0;
let rotationMode = true;
let rotAngle = 0;
let viewMatrix;

var wireframeProgram;
var gouraudProgram;
var phongProgram;
var activeProgram;

const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

var cameraPosition;
var reflectivity = 0.5; // Adjust this value as needed

var LX = 1.0;
var LY = 1.0;
var LZ = 1.0;

var lightPosition = vec4(LX, LY, LZ, 0.0);
var lightAmbient = vec4(0.5, 0.5, 0.5, 1.0);
var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

var materialAmbient = vec4(1.0, 1.0, 1.0, 1.0);
var materialDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
var materialSpecular = vec4(1.0, 1.0, 1.0, 1.0);
var materialShininess = 50.0;

var ambientProduct;
var diffuseProduct;
var specularProduct;
var modelViewMatrix;

var normalsArray = [];
var modeViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;
var normalMatrix, normalMatrixLoc;

var tangent = vec3(1.0, 0.0, 0.0);

var texSize = 32;

var temp = new Array();
for (var i = 0; i < texSize; i++) temp[i] = new Array();

for (var i = 0; i < texSize; i++)
  for (var j = 0; j < texSize; j++) temp[i][j] = new Float32Array(4);

for (var i = 0; i < texSize; i++) {
  for (var j = 0; j < texSize; j++) {
    var isRed = ((i & 0x8) == 0) ^ ((j & 0x8) == 0);
    if (isRed) {
      // Red color
      temp[i][j] = [1, 0, 0, 1]; // Red with full opacity
    } else {
      // White color
      temp[i][j] = [1, 1, 1, 0]; // White with full opacity
    }
  }
}

// Convert floats to ubytes for texture
var image2 = new Uint8Array(4 * texSize * texSize);

for (var i = 0; i < texSize; i++)
  for (var j = 0; j < texSize; j++)
    for (var k = 0; k < 4; k++)
      image2[4 * texSize * i + 4 * j + k] = 255 * temp[i][j][k];

function loadCubemap() {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

  const faceInfos = [
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      url: "pos-x.jpg",
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      url: "neg-x.jpg",
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      url: "pos-y.jpg",
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      url: "neg-y.jpg",
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      url: "pos-z.jpg",
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      url: "neg-z.jpg",
    },
  ];
  faceInfos.forEach((faceInfo) => {
    const { target, url } = faceInfo;
    // Initialize the texture to blue while it loads
    gl.texImage2D(
      target,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 255, 255])
    );

    // Asynchronously load an image
    const image = new Image();
    image.src = url;
    image.addEventListener("load", function () {
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
      gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    });
  });
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.texParameteri(
    gl.TEXTURE_CUBE_MAP,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR
  );
  return texture;
}

// Assuming you have a function to load textures, create a cubemap texture.
function loadTexture(url) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
  gl.texImage2D(
    gl.TEXTURE_2D,
    level,
    internalFormat,
    width,
    height,
    border,
    srcFormat,
    srcType,
    pixel
  );

  const image = new Image();
  image.onload = function () {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      srcFormat,
      srcType,
      image
    );
    gl.generateMipmap(gl.TEXTURE_2D);
  };
  image.src = url;

  return texture;
}


function loadImageForCubemapFace(gl, url, target, cubemapTexture) {
  const level = 0;
  const internalFormat = gl.RGBA;
  const format = gl.RGBA;
  const type = gl.UNSIGNED_BYTE;

  const image = new Image();
  image.onload = function () {
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture);
    gl.texImage2D(target, level, internalFormat, format, type, image);
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  };
  image.src = url;
}

// Throttling function to prevent regenerateBreatherSurface from being called too frequently
let throttleTimer;
const throttle = (callback, time) => {
  if (throttleTimer) return;

  throttleTimer = true;
  setTimeout(() => {
    callback();
    throttleTimer = false;
  }, time);
};

// scale in MV does not work
function scale4(a, b, c) {
  const result = mat4();
  result[0][0] = a;
  result[1][1] = b;
  result[2][2] = c;
  return result;
}

window.onload = function () {
  canvas = document.getElementById("render-surface");
  gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) {
    alert("Your browser does not support WebGL");
    return;
  }

  wireframeProgram = initShaders(
    gl,
    "wireframe-vertex-shader",
    "wireframe-fragment-shader"
  );
  gouraudProgram = initShaders(
    gl,
    "gouraud-vertex-shader",
    "gouraud-fragment-shader"
  );
  phongProgram = initShaders(
    gl,
    "phong-vertex-shader",
    "phong-fragment-shader"
  );

  // Check if shader programs are successfully created
  if (!wireframeProgram || !gouraudProgram || !phongProgram) {
    console.error("Shader program initialization failed");
    return;
  }

  var lightPositionValue = [1.0, 1.0, 1.0, 0.0]; // Use w=0 for directional light, w=1 for point light

  ambientProduct = mult(lightAmbient, materialAmbient);
  diffuseProduct = mult(lightDiffuse, materialDiffuse);
  specularProduct = mult(lightSpecular, materialSpecular);
  modelViewMatrix = mat4();

  // Set the initial active program to wireframe as an example
  activeProgram = wireframeProgram;

  // Initialize shader uniforms after shader program creation
  initializeShaderUniforms();

  initializeLightPosition(wireframeProgram, lightPositionValue);
  initializeLightPosition(gouraudProgram, lightPositionValue);
  initializeLightPosition(phongProgram, lightPositionValue);

  gl.useProgram(activeProgram);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.frontFace(gl.CCW);
  gl.cullFace(gl.BACK);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 1.0);

  document.onkeydown = function (event) {
    switch (event.keyCode) {
      case 87:
        xRot += cameraSpeed;
        break;
      case 83:
        xRot -= cameraSpeed;
        break;
      case 38:
        event.preventDefault();
        radius -= cameraSpeed;
        break;
      case 40:
        event.preventDefault();
        radius += cameraSpeed;
        break;
    }
    updateViewMatrix();
  };

  // Add event listeners to each radio button
  let wireframeRadio = document.getElementById("wireframe");
  let gouraudRadio = document.getElementById("gouraud");
  let phongRadio = document.getElementById("phong");

  cubemapTexture = loadCubemap();

  if (wireframeRadio) {
    wireframeRadio.addEventListener("change", function () {
      wireMode = 0;
      handleRenderTypeChange(this.value);
    });
  }

  if (gouraudRadio) {
    gouraudRadio.addEventListener("change", function () {
      wireMode = 1;
      handleRenderTypeChange(this.value);
    });
  }

  if (phongRadio) {
    phongRadio.addEventListener("change", function () {
      wireMode = 2;
      handleRenderTypeChange(this.value);
    });
  }

  document.getElementById("toggleRotation").onclick = function () {
    rotationMode = !rotationMode;
  };

  document.getElementById("aa").oninput = function () {
    aa = parseFloat(document.getElementById("aa").value);
    regenerateBreatherSurface();
  };

  document.getElementById("u-range").oninput = function () {
    uValue = parseFloat(document.getElementById("u-range").value);
    regenerateBreatherSurface();
  };

  document.getElementById("v-range").oninput = function () {
    vValue = parseFloat(document.getElementById("v-range").value);
    regenerateBreatherSurface();
  };

  document.getElementById("magnitude").oninput = function () {
    magnitude = parseFloat(document.getElementById("magnitude").value);
    if (mesh) mesh.setScale(magnitude);
    throttle(updateMesh, 100); // Throttle calls to 100ms
  };

  regenerateBreatherSurface();
  updateViewMatrix();
  render();
};

function initializeLightPosition(program, lightPosition) {
  gl.useProgram(program); // Ensure the correct program is being used
  var lightPositionLocation = gl.getUniformLocation(program, "lightPosition");
  if (lightPositionLocation === null) {
    // The uniform might not exist in the shader or isn't used.
    console.warn(
      "Uniform 'lightPos' does not exist in the current program or is not used."
    );
    return;
  }
  gl.uniform4fv(lightPositionLocation, lightPosition);
}

function regenerateBreatherSurface() {
  console.log("uValue: " + uValue);
  console.log("vValue: " + vValue);
  // Load the cubemap textures
  const donutTexture = loadTexture("donut.jpg"); // Provide the correct path to donut.jpg
  cubemapTexture = loadCubemap();

  // Create the Mesh instance with the cubemap texture
  mesh = new Mesh(
    breatherSurface(line_count, line_count, aa, uValue, vValue),
    donutTexture
  );
  mesh.setScale(magnitude);
  mesh.setWireMode(wireMode);
  // Make sure this is called to upload initial data
  mesh.updateVertices(
    breatherSurface(line_count, line_count, aa, uValue, vValue)
  );
  updateViewMatrix();
}

function handleRenderTypeChange(renderType) {
  switch (renderType) {
    case "wireframe":
      activeProgram = wireframeProgram;
      break;
    case "gouraud":
      activeProgram = gouraudProgram;
      break;
    case "phong":
      activeProgram = phongProgram;
      break;
  }
  gl.useProgram(activeProgram);
  initializeShaderUniforms();
  if (mesh) {
    mesh.prepareModel(gl, activeProgram, viewMatrix, projectionMatrix);
  }
  regenerateBreatherSurface();
}

function initializeShaderUniforms() {
  var ambientProductLoc = gl.getUniformLocation(
    activeProgram,
    "ambientProduct"
  );
  var diffuseProductLoc = gl.getUniformLocation(
    activeProgram,
    "diffuseProduct"
  );
  var specularProductLoc = gl.getUniformLocation(
    activeProgram,
    "specularProduct"
  );
  var shininessLoc = gl.getUniformLocation(activeProgram, "shininess");
  var lightPositionLoc = gl.getUniformLocation(activeProgram, "lightPosition");

  if (
    ambientProductLoc &&
    diffuseProductLoc &&
    specularProductLoc &&
    shininessLoc &&
    lightPositionLoc
  ) {
    gl.uniform4fv(ambientProductLoc, flatten(ambientProduct));
    gl.uniform4fv(diffuseProductLoc, flatten(diffuseProduct));
    gl.uniform4fv(specularProductLoc, flatten(specularProduct));
    gl.uniform1f(shininessLoc, materialShininess);
    gl.uniform4fv(lightPositionLoc, flatten(lightPosition));
  }
}

function updateMesh() {
  if (mesh) {
    mesh.updateVertices(
      breatherSurface(line_count, line_count, aa, uValue, vValue)
    );
    mesh.setScale(magnitude);
    mesh.setWireMode(wireMode);
  }
}

function updateViewMatrix() {
  viewMatrix = createViewMatrix(radius, xRot, yRot, zRot);
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(activeProgram); 

  var eye = vec3(
    radius * Math.sin(phi),
    radius * Math.sin(theta),
    radius * Math.cos(phi)
  );
  modelViewMatrix = lookAt(eye, at, up);
  cameraPosition = eye;

  normalMatrix = [
    vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
    vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
    vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2]),
  ];

  if (!projectionMatrix) {
    projectionMatrix = perspective(
      radians(110),
      canvas.width / canvas.height,
      0.1,
      1000000.0
    );
  }

  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
  gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
  gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix));

  cubemapTexture = loadCubemap();

  // Correcting the usage of activeProgram instead of program
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture);
  gl.uniform1i(gl.getUniformLocation(activeProgram, "texMap"), 0);


  if (rotationMode) {
    rotAngle += 0.5;
  }

  if (mesh) {
    mesh.setupEnvironmentMapping();
    mesh.setRotation(rotAngle, rotAngle, rotAngle);
    mesh.render(gl, activeProgram, viewMatrix, projectionMatrix);
  }

  requestAnimationFrame(render);
}

function createViewMatrix(radius, xRot, yRot, zRot) {
  let viewMatrix = mat4();
  viewMatrix = lookAt(vec3(0, 0, radius), vec3(0, 0, 0), vec3(0, 1, 0));
  viewMatrix = mult(viewMatrix, rotate(xRot, vec3(1, 0, 0)));
  viewMatrix = mult(viewMatrix, rotate(yRot, vec3(0, 1, 0)));
  viewMatrix = mult(viewMatrix, rotate(zRot, vec3(0, 0, 1)));
  return viewMatrix;
}

function configureTexture(image, texture) {
  texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGB,
    texSize,
    texSize,
    0,
    gl.RGB,
    gl.UNSIGNED_BYTE,
    image
  );
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.NEAREST_MIPMAP_LINEAR
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}

function breatherSurface(N, M, aa, uValue, vValue) {
  let vertices = [];
  let normals = [];
  let textureCoords = [];
  let w = Math.sqrt(1 - aa * aa);

  let uMin = -uValue;
  let uMax = uValue;
  let vMin = -vValue;
  let vMax = vValue;

  let uStep = (uMax - uMin) / N;
  let vStep = (vMax - vMin) / M;

  for (let i = 0; i <= N; i = i + 1) {
    let u = uMin + i * uStep;
    for (let j = 0; j <= M; j = j + 1) {
      let v = vMin + j * vStep;

      let cosh_au = Math.cosh(aa * u);
      let sinh_au = Math.sinh(aa * u);
      let sin_wv = Math.sin(w * v);
      let cos_wv = Math.cos(w * v);
      let cos_v = Math.cos(v);
      let sin_v = Math.sin(v);

      let denom = aa * (cosh_au * cosh_au + aa * sin_v * aa * sin_v);
      let x = -u + (2 * (1 - aa * aa) * sinh_au * cosh_au) / denom;
      let y = (2 * w * cosh_au * (-cos_v * cos_wv - sin_v * sin_wv)) / denom;
      let z = (2 * w * cosh_au * (-sin_v * cos_wv + cos_v * sin_wv)) / denom;

      // Partial derivatives
      let xu = (-1 + (2 * (1 - aa * aa) * cosh_au * cosh_au) / denom) * aa;
      let yu = (2 * w * sinh_au * (-cos_v * cos_wv - sin_v * sin_wv)) / denom;
      let zu = (2 * w * sinh_au * (-sin_v * cos_wv + cos_v * sin_wv)) / denom;

      let xv = 0;
      let yv = 2 * w * cosh_au * (w * sin_v * cos_wv - cos_v * sin_wv) * aa;
      let zv = -2 * w * cosh_au * (w * cos_v * cos_wv + sin_v * sin_wv) * aa;

      // Cross product of partial derivatives gives the normal
      let nx = yu * zv - zu * yv;
      let ny = zu * xv - xu * zv;
      let nz = xu * yv - yu * xv;

      // Normalize the normal
      let length = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= length;
      ny /= length;
      nz /= length;

      vertices.push(x, y, z);
      normals.push(nx, ny, nz);
      textureCoords.push(i / N, j / M);
    }
  }
  return [vertices, normals, textureCoords];
}

// Mesh object
class Mesh {
  constructor(data, texture) {
    this.vertices = data[0];
    this.normals = data[1];
    this.texCoords = data[2];
    this.texture = texture;
    this.translation = vec3(0, 0, 0);
    this.rotation = vec3(0, 0, 0);
    this.scale = 1;
    this.vBuffer = gl.createBuffer();
    this.nBuffer = gl.createBuffer();
    this.tBuffer = gl.createBuffer();
    this.prepareBuffers();
    this.initBufferArrays();
  }

  prepareBuffers() {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(this.vertices),
      gl.STATIC_DRAW
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, this.nBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(this.normals),
      gl.STATIC_DRAW
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(this.texCoords),
      gl.STATIC_DRAW
    );
  }

  // Method to set up shader program with environment mapping
  setupEnvironmentMapping() {
    gl.useProgram(activeProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.texture);
    gl.uniform1i(gl.getUniformLocation(activeProgram, "uEnvironmentMap"), 0);
    gl.uniform3fv(
      gl.getUniformLocation(activeProgram, "uCameraPosition"),
      flatten(cameraPosition)
    );
    gl.uniform1f(
      gl.getUniformLocation(activeProgram, "uReflectivity"),
      reflectivity
    );
  }

  initBufferArrays() {
    this.linebuffer = gl.createBuffer();
    this.triangleStripBuffer = gl.createBuffer();
    this.triangleStrip = new Uint16Array(
      line_count * (2 * (line_count + 1) + 2) - 2
    );
    let n = 0;
    for (let i = 0; i < line_count; i++) {
      for (let j = 0; j <= line_count; j++) {
        this.triangleStrip[n++] = (i + 1) * (line_count + 1) + j;
        this.triangleStrip[n++] = i * (line_count + 1) + j;
      }
    }
    let lines = [];
    lines.push(this.triangleStrip[0], this.triangleStrip[1]);
    for (let i = 2; i < this.triangleStrip.length; i++) {
      let a = this.triangleStrip[i - 2];
      let b = this.triangleStrip[i - 1];
      let c = this.triangleStrip[i];
      if (a != b && b != c && c != a) lines.push(a, c, b, c);
    }
    this.wireframe = new Uint16Array(lines);
  }

  updateVertices(data) {
    this.vertices = data[0];
    this.normals = data[1];
    this.texCoords = data[2];
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(this.vertices),
      gl.STATIC_DRAW
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(this.texCoords),
      gl.STATIC_DRAW
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, this.nBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(this.normals),
      gl.STATIC_DRAW
    );
  }

  prepareModel(gl, program, viewMatrix, projectionMatrix) {
    gl.useProgram(program);
    configureTexture(image2);
    let positionAttribLocation = gl.getAttribLocation(program, "vPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
    gl.vertexAttribPointer(positionAttribLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionAttribLocation);
    let texCoordAttribLocation = gl.getAttribLocation(program, "vTexCoord");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tBuffer);
    gl.vertexAttribPointer(texCoordAttribLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(texCoordAttribLocation);
    let normalAttribLocation = gl.getAttribLocation(program, "vNormal");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.nBuffer);
    gl.vertexAttribPointer(normalAttribLocation, 3, gl.FLOAT, true, 0, 0);
    gl.enableVertexAttribArray(normalAttribLocation);
    gl.uniformMatrix4fv(
      gl.getUniformLocation(program, "modelMatrix"),
      false,
      flatten(this.createTranformationMatrix())
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(program, "viewMatrix"),
      false,
      flatten(viewMatrix)
    );
    gl.uniformMatrix4fv(
      gl.getUniformLocation(program, "projectionMatrix"),
      false,
      flatten(projectionMatrix)
    );
    gl.uniform1f(gl.getUniformLocation(program, "wireMode"), this.wireMode);
    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");
    gl.uniform4fv(
      gl.getUniformLocation(program, "ambientProduct"),
      flatten(ambientProduct)
    );
    gl.uniform4fv(
      gl.getUniformLocation(program, "diffuseProduct"),
      flatten(diffuseProduct)
    );
    gl.uniform4fv(
      gl.getUniformLocation(program, "specularProduct"),
      flatten(specularProduct)
    );
    gl.uniform4fv(
      gl.getUniformLocation(program, "lightPosition"),
      flatten(lightPosition)
    );
    gl.uniform1f(
      gl.getUniformLocation(program, "shininess"),
      materialShininess
    );
    gl.uniform3fv(
      gl.getUniformLocation(program, "objTangent"),
      flatten(tangent)
    );
  }

  createTranformationMatrix() {
    let matrix = mat4();
    matrix = mult(
      matrix,
      translate(this.translation[0], this.translation[1], this.translation[2])
    );
    matrix = mult(matrix, rotate(this.rotation[0], vec3(1, 0, 0)));
    matrix = mult(matrix, rotate(this.rotation[1], vec3(0, 1, 0)));
    matrix = mult(matrix, rotate(this.rotation[2], vec3(0, 0, 1)));
    matrix = mult(matrix, scale4(this.scale, this.scale, this.scale));
    return matrix;
  }
  //Render function of the mesh object
  render(gl, program, viewMatrix, projectionMatrix) {
    this.prepareModel(gl, program, viewMatrix, projectionMatrix);
    if (this.wireMode == 0) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.linebuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.wireframe, gl.STATIC_DRAW);
      gl.drawElements(gl.LINES, this.wireframe.length, gl.UNSIGNED_SHORT, 0);
    } else {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.texture);
      gl.uniform1i(gl.getUniformLocation(program, "texture"), 0); // Set the texture uniform to the active texture index
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleStripBuffer);
      gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        this.triangleStrip,
        gl.STATIC_DRAW
      );
      gl.drawElements(
        gl.TRIANGLE_STRIP,
        this.triangleStrip.length,
        gl.UNSIGNED_SHORT,
        0
      );
    }
  }

  setRotation(x, y, z) {
    this.rotation = vec3(x, y, z);
  }

  setScale(s) {
    this.scale = s;
  }

  setWireMode(mode) {
    this.wireMode = mode;
  }
}
