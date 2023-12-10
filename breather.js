    let canvas;
    let gl;
    let program;
    let shape_type = 0;
    let selectedTexture = 0;
    const cameraSpeed = 2;
    let wireMode = 0;
    let magnitude = 0.5;
    
    const line_count = 50;
    
    let radius = 160;
    let xRot = 110;
    let yRot = 180;
    let zRot = 0;
    let R = 2.5;
    
    let viewMatrix;
    let projectionMatrix;
    
    let rotationMode = true;
    let rotAngle = 0;
        
    let aa = 0.5;
    let uMin = -14, uMax = 14;
    let vMin = -37.4, vMax = 37.4;
    

    // scale in MV does not work
    function scale4(a, b, c) {
        const result = mat4();
        result[0][0] = a;
        result[1][1] = b;
        result[2][2] = c;
        return result;
    }
    // Checks if the given value is power of 2
    function isPowerOf2(value) {
        return (value & (value - 1)) == 0;
    }

    // Breather surface equations
function breatherX(u, v, a) {
    const w = Math.sqrt(1 - a * a);
    const denom = a * (Math.pow(w * Math.cosh(a * u), 2) + Math.pow(a * Math.sin(w * v), 2));
    return -u + (2 * (1 - a * a) * Math.cosh(a * u) * Math.sinh(a * u)) / denom;
}

function breatherY(u, v, a) {
    const w = Math.sqrt(1 - a * a);
    const denom = a * (Math.pow(w * Math.cosh(a * u), 2) + Math.pow(a * Math.sin(w * v), 2));
    return (2 * w * Math.cosh(a * u) * (-w * Math.cos(v) * Math.cos(w * v) - Math.sin(v) * Math.sin(w * v))) / denom;
}

function breatherZ(u, v, a) {
    const w = Math.sqrt(1 - a * a);
    const denom = a * (Math.pow(w * Math.cosh(a * u), 2) + Math.pow(a * Math.sin(w * v), 2));
    return (2 * w * Math.cosh(a * u) * (-w * Math.sin(v) * Math.cos(w * v) + Math.cos(v) * Math.sin(w * v))) / denom;
}


    // Calculation of distance between two point
    function distance(p1, p2) {
        return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2) + Math.pow(p1[2] - p2[2], 2));
    }
    
    window.onload = function() {
        canvas = document.getElementById('render-surface');
        gl = canvas.getContext('webgl');
    
        if (!gl) gl = canvas.getContext('experimental-webgl');
        if (!gl) return alert("Your browser does not support WEBGL");
    
        program = initShaders(gl, 'vertexShader', 'fragmentShader');
        gl.useProgram(program);
    
        gl.bindTexture(gl.TEXTURE_2D, texture(gl, 'erdem'));
        gl.activeTexture(gl.TEXTURE0);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);
        gl.frontFace(gl.CCW);
        gl.cullFace(gl.BACK);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 1.0);
    
        //Camera controls
        document.onkeydown = function(event) {
            switch (event.keyCode) {
                // W
                case 87:
                    xRot += cameraSpeed;
                    break;
                // S
                case 83:
                    xRot -= cameraSpeed;
                    break;
                // UP
                case 38:
                    event.preventDefault();
                    radius -= cameraSpeed;
                    break;
                // DOWN
                case 40:
                    event.preventDefault();
                    radius += cameraSpeed;
                    break;
            }
        };
        //Checkbox for Texture Mode
        let checkbox = document.getElementById("checkbox");
        checkbox.addEventListener( 'change', function() {
            if(this.checked) 
            {
                wireMode = 1;
            } 
            else 
            {
                wireMode = 0;
            }
        });
        
        //Texture selector
        let textureSelector = document.getElementById("textureSelector");
        textureSelector.addEventListener("click", function() {
            selectedTexture = textureSelector.selectedIndex;
            if (selectedTexture == 0){
                gl.bindTexture(gl.TEXTURE_2D, texture(gl, 'erdem'));
                gl.activeTexture(gl.TEXTURE0);
            }
            else if (selectedTexture == 1){
                gl.bindTexture(gl.TEXTURE_2D, texture(gl, 'aytek'));
                gl.activeTexture(gl.TEXTURE0);
            }
            else if (selectedTexture == 2){
                gl.bindTexture(gl.TEXTURE_2D, texture(gl, 'mustafa'));
                gl.activeTexture(gl.TEXTURE0);
            }
            });
    
        //Controls rotation
        document.getElementById('toggleRotation').onclick = function() {
            rotationMode = !rotationMode;
        };

    
        //Controls aa
        document.getElementById('aa').oninput = function() {
            aa = document.getElementById('aa').value;
        };
    
        
        // Update the Breather surface whenever a slider value changes
        document.getElementById('u-range').oninput = function() {
            uMin = document.getElementById('u-range').min;
            uMax = document.getElementById('u-range').max;
        };
        
        document.getElementById('v-range').oninput = function(event) {
            vMin = document.getElementById('v-range').min;
            vMax = document.getElementById('v-range').max;
     
        };	
        //Controls magnitude
        document.getElementById('magnitude').oninput = function() {
            magnitude = document.getElementById('magnitude').value;
        };
        //Controls R

    
        render();
    };
    
    function render() {
        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
        viewMatrix = createViewMatrix(radius, xRot, yRot, zRot);
        projectionMatrix = perspective(radians(110), canvas.width / canvas.height, 0.1, 1000000.0);

    
        let breatherData = breatherSurface(line_count, line_count, aa);
    let shape = new Mesh(breatherData);
    shape.setScale(magnitude);
    shape.setRotation(0, 180, rotAngle);
    shape.setWireMode(wireMode);
    shape.render(gl, program, viewMatrix, projectionMatrix);
    
        if (rotationMode) rotAngle += 0.5;
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
    
    // Setups texture
    function texture(gl, name) {
        let ext = gl.getExtension('MOZ_EXT_texture_filter_anisotropic');
        if (!ext) ext = gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
    
        const image = document.getElementById(name);
        const t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
        if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        if (isPowerOf2(image.width) && isPowerOf2(image.height)) gl.generateMipmap(gl.TEXTURE_2D);
        else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
        gl.bindTexture(gl.TEXTURE_2D, null);
    
        return t;
    }
    
    
    function breatherSurface(N, M, aa) {
        let vertices = [];
        let normals = [];
        let textureCoords = [];
        let delta = 0.0001;
        
        // Constants for the parametric equations
        let wsqr = 1 - aa * aa;
        let w = Math.sqrt(wsqr);
        
        let uStep = (uMax - uMin) / N;
        let vStep = (vMax - vMin) / M;
    
        for (let i = 0; i <= N; i++) {
            let u = uMin + i * uStep;
            for (let j = 0; j <= M; j++) {
                let v = vMin + j * vStep;
                
                // Calculate the denominators
                let denom = aa * (Math.pow(w * Math.cosh(aa * u), 2) + Math.pow(aa * Math.sin(w * v), 2));
                
                // Calculate the positions using the parametric equations
                let x = -u + (2 * wsqr * Math.cosh(aa * u) * Math.sinh(aa * u) / denom);
                let y = 2 * w * Math.cosh(aa * u) * (-w * Math.cos(v) * Math.cos(w * v) - Math.sin(v) * Math.sin(w * v)) / denom;
                let z = 2 * w * Math.cosh(aa * u) * (-w * Math.sin(v) * Math.cos(w * v) + Math.cos(v) * Math.sin(w * v)) / denom;
                
                // Push the positions to the vertices array
                vertices.push(x, y, z);
                
                // Calculate normals using a numerical approach (central difference)
                let x_u = breatherX(u + delta, v, aa) - breatherX(u - delta, v, aa);
                let y_u = breatherY(u + delta, v, aa) - breatherY(u - delta, v, aa);
                let z_u = breatherZ(u + delta, v, aa) - breatherZ(u - delta, v, aa);
                let x_v = breatherX(u, v + delta, aa) - breatherX(u, v - delta, aa);
                let y_v = breatherY(u, v + delta, aa) - breatherY(u, v - delta, aa);
                let z_v = breatherZ(u, v + delta, aa) - breatherZ(u, v - delta, aa);
                
                let normalX = y_u * z_v - z_u * y_v;
                let normalY = z_u * x_v - x_u * z_v;
                let normalZ = x_u * y_v - y_u * x_v;
                
                let length = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);
                normals.push(normalX / length, normalY / length, normalZ / length);
                
                // Push texture coordinates (u and v scaled to [0, 1] range)
                textureCoords.push(i / N, j / M);
            }
            
        }
        
        return [vertices, textureCoords, normals];
    }
    
    
    // Mesh object
    class Mesh {
        constructor(data) {
            this.vertices = data[0];
            this.texCoords = data[1];
            this.normals = data[2];
    
            this.translation = vec3(0, 0, 0);
            this.rotation = vec3(0, 0, 0);
            this.scale = 1;
    
            this.wireMode = 0;
        }
    
        prepareModel(gl, program, viewMatrix, projectionMatrix) {
            gl.useProgram(program);
    
            let positionAttribLocation = gl.getAttribLocation(program, 'vPosition');
            let texCoordAttribLocation = gl.getAttribLocation(program, 'vTexCoord');
            let normalAttribLocation = gl.getAttribLocation(program, 'vNormal');
    
            this.vBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
    
            this.tBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.tBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.texCoords), gl.STATIC_DRAW);
    
            this.nBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.nBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);
    
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
            gl.vertexAttribPointer(positionAttribLocation, 3, gl.FLOAT, gl.FALSE, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
            gl.enableVertexAttribArray(positionAttribLocation);
    
            gl.bindBuffer(gl.ARRAY_BUFFER, this.tBuffer);
            gl.vertexAttribPointer(texCoordAttribLocation, 2, gl.FLOAT, gl.FALSE, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
            gl.enableVertexAttribArray(texCoordAttribLocation);
    
            gl.bindBuffer(gl.ARRAY_BUFFER, this.nBuffer);
            gl.vertexAttribPointer(normalAttribLocation, 3, gl.FLOAT, gl.TRUE, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
            gl.enableVertexAttribArray(normalAttribLocation);
    
            gl.uniformMatrix4fv(gl.getUniformLocation(program, 'modelMatrix'), gl.FALSE, flatten(this.createTranformationMatrix()));
            gl.uniformMatrix4fv(gl.getUniformLocation(program, 'viewMatrix'), gl.FALSE, flatten(viewMatrix));
            gl.uniformMatrix4fv(gl.getUniformLocation(program, 'projectionMatrix'), gl.FALSE, flatten(projectionMatrix));
    
            gl.uniform1f(gl.getUniformLocation(program, 'wireMode'), this.wireMode);
    
            // Organize cordinates for texture drawing
            this.triangleStrip = null;
            this.triangleStrip = new Uint16Array(line_count * (2 * (line_count + 1) + 2) - 2);
            let n = 0;
            for (let i = 0; i < line_count; i++) {
                for (let j = 0; j <= line_count; j++) {
                    this.triangleStrip[n++] = (i + 1) * (line_count + 1) + j;
                    this.triangleStrip[n++] = i * (line_count + 1) + j;
                }
            }
    
            // Organize cordinates for wireframe
            if (this.wireMode == 0){
                let lines = [];
                lines.push(this.triangleStrip[0], this.triangleStrip[1]);
                let numStripIndices = this.triangleStrip.length;
                
                for (let i = 2; i < numStripIndices; i++) {
                    let a = this.triangleStrip[i - 2];
                    let b = this.triangleStrip[i - 1];
                    let c = this.triangleStrip[i];
        
                    if (a != b && b != c && c != a) lines.push(a, c, b, c);
                }
        
                this.wireframe = new Uint16Array(lines);
            }
            
    
            this.triangleStripBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleStripBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.triangleStrip, gl.STATIC_DRAW);
    
            this.linebuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.linebuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.wireframe, gl.STATIC_DRAW);
        }
    
        createTranformationMatrix() {
            let matrix = mat4();
            matrix = mult(matrix, translate(this.translation[0], this.translation[1], this.translation[2]));
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
                gl.drawElements(gl.LINES, this.wireframe.length, gl.UNSIGNED_SHORT, 0);
            } 
            else 
            {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triangleStripBuffer);
                gl.drawElements(gl.TRIANGLE_STRIP, this.triangleStrip.length, gl.UNSIGNED_SHORT, 0);
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
    
    