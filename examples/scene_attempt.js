import {defs, tiny} from './common.js';
import {Shape_From_File} from "./obj-file-demo.js";
// Pull these names into this module's scope for convenience:
const tilescale = 10;
const {vec3, vec4, color, hex_color, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;
const {Textured_Phong} = defs;
export class Scene_Attempt extends Scene {                             // **Many_Lights_Demo** demonstrates how to make the illusion that
                                                                          // there are many lights, despite only passing two to the shader.
                                                                          // We re-locate the lights in between individual shape draws.
                                                                          // Doing this trick performs much faster than looping through a
                                                                          // long list of lights within the fragment shader, none of which
                                                                          // need to affect every single shape in the scene.
    constructor() {
        super();

        this.xdir = 0; // x-value of car velocity
        this.xpos = 0; // x-position of car
        this.ydir = 1; // y-modifier of car velocity
        this.ydir_lerped = 1;
        this.buttons = [0, 0, 0, 0] // array of button statuses; 0 = up, 1 = down
        //this.tiles = 21; // number of road tiles
        this.y_angle = 0;
        
        this.roadWidth = 4; //Scale of road width
        this.roadDepth = 2.5; //Scale of road depth

        this.tiles = 101; // number of road tiles
        
        this.rocks = 50; // number of total collidable objects                

        this. coins = 5; //total nubmer of coins on the road at once

        this.collision = 0; //0: no collision, 1: in collision

        this.pause = 0; //0: FALSE, 1: TRUE

        this.outofbound = 0; //0: in bounds, 1: out of bounds

        this.score = 0; //Player's score for getting coins

        this.shapes = {
            toyota: new Shape_From_File("assets/AE86_4.obj"),
            statue: new Shape_From_File("assets/12328_Statue_v1_L3.obj"),
            cube: new defs.Cube(),
            plane: new Shape_From_File("assets/plane.obj"),
            road: new defs.Cube(),
            sky: new defs.Subdivision_Sphere(4),
            rock: new Shape_From_File("assets/Rock1.obj"),
            tree: new Shape_From_File("assets/tree.obj"),
            city: new Shape_From_File("assets/sehir.obj"),
            coin: new Shape_From_File("assets/coin2.OBJ"),
        };
        
        //Modify texture coordinate scaling for repeating road tiles in y direction
        this.shapes.road.arrays.texture_coord.forEach(element => element[1] *= this.tiles);

        const phong = new defs.Phong_Shader();

        this.materials = {
            road : new Material(new RoadShader(), {
                color: hex_color("#000000"),
                ambient: 0.5, diffusivity: 0.5, specularity: 0.25, y_scale: 1.0, y_speed: 3.0,
                texture: new Texture("assets/street.jpg", "NEAREST")
            }),
            car : new Material(new CarShader(), {
                color: hex_color("#000000"),
                ambient: 0.5, diffusivity: 0.75, specularity: 1,
                texture: new Texture("assets/hd_tex_page.png")
            }),
            city: new Material(phong, {
                color: hex_color("#000000"),
                ambient: 1, diffusivity: 0.5, specularity: 1,
            }),
            ground : new Material(new RoadShader(), {
                color: hex_color("#000000"),
                ambient: 0.75, diffusivity: 1, specularity: 0.1, y_scale: 150.0, y_speed: 3.0,
                texture: new Texture("assets/ground.png")
            }),
            coin : new Material(phong, {
                color: hex_color("#D4AF37"),
                ambient: 1., diffusivity: 0.5, specularity: 1.,
            }),
            rock : new Material(new CarShader(), {
                color: hex_color("#000000"),
                ambient: 0.5, diffusivity: 0.75, specularity: 1,
                texture: new Texture("assets/Rock-Texture-Surface.jpg")
            }),
            tree:new Material(new CarShader(), {
                ambient: 0, diffusivity: 0.5, specularity: 0.5, smoothness: 0,
                texture: new Texture("assets/tree.png")
            }),
            sky :  new Material(new Texture_Scroll_Y(), {
                color: hex_color("#000000"),
                ambient: 1.0, diffusivity: 0.5, specularity: 0.5,
                texture: new Texture("assets/sky2.png")
            }),
            statue: new Material(new CarShader(), {
                color: hex_color("#000000"),
                ambient: 0.5, diffusivity: 0.75, specularity: 1,
                texture: new Texture("assets/statue.jpg")
            }),
            cloud1: new Material(new FlatShader(), {
                color: hex_color("#000000"),
                ambient: 0.5, diffusivity: 0.75, specularity: 1,
                texture: new Texture("assets/cloud.png", "NEAREST")
            }),
            sun: new Material(new FlatShader(), {
                color: hex_color("#000000"),
                ambient: 1, diffusivity: 0.75, specularity: 1,
                texture: new Texture("assets/circle.png", "NEAREST")
            }),
        };

        //Initialize positions of coin objects in the scene
        this.coin_positions = []
        this.coin_active = []

        for(let item = 0; item < this.coins; item++)
        {
            const posX = this.roadWidth*Math.random() - this.roadWidth*Math.random()
            const posZ = this.roadDepth*2*this.tiles / (item + 1)
            this.coin_positions.push(vec3(posX, 1, -posZ))
            this.coin_active.push(true)
        }


        //Initialize positions of collidable objects in the scene
        this.rock_positionsL = [];
        this.rock_positionsR = [];

        const epsilon = 1;
        for(let rock = 0; rock < this.rocks; rock++)
        {
            let posX = 0;
            let posZ = 0;
            if (rock % 11 != 0) {
                posX = this.roadWidth*2 + epsilon + (this.roadWidth*Math.random() - this.roadWidth*Math.random());
                posZ = this.roadDepth*4 + epsilon/2.0 + (this.roadDepth*2*Math.random() - this.roadDepth*2*Math.random());
            }
            else
            {
                posX = this.roadWidth + epsilon + 0.5;
                posZ = this.roadDepth*4 + epsilon/2.0 + (this.roadDepth*2*Math.random() - this.roadDepth*2*Math.random());
            }
            this.rock_positionsL.push(vec3(-posX, 0, -posZ*rock));
        }

        for(let rock = 0; rock < this.rocks; rock++)
        {
            let posX = 0;
            let posZ = 0;
            if (rock % 11 != 0) {
                posX = this.roadWidth * 2 + epsilon + (this.roadWidth * Math.random() - this.roadWidth * Math.random());
                posZ = this.roadDepth * 4 + epsilon / 2.0 + (this.roadDepth * 2 * Math.random() - this.roadDepth * 2 * Math.random());
            }
            else
            {
                posX = this.roadWidth + epsilon + 0.5;
                posZ = this.roadDepth*4 + epsilon/2.0 + (this.roadDepth*2*Math.random() - this.roadDepth*2*Math.random());
            }
            this.rock_positionsR.push(vec3(posX, 0, -posZ*rock));
        }
    }

    make_control_panel() {
        // make_control_panel(): Sets up a panel of interactive HTML elements, including
        // buttons with key bindings for affecting this scene, and live info readouts.
        this.key_triggered_button("PAUSE", ["p"],
        function () {
            this.pause ^= 1;
        },
        '#6E6460');
        this.key_triggered_button("Accelerate", ["w"],
            function () {
                this.buttons[2] = 1;
                this.ydir = 2;
            },
            '#6E6460',
            function () {
                this.buttons[2] = 0;
                if (this.buttons[3] === 1)
                    this.ydir = 0.25;
                else
                    this.ydir = 1;
            });
        this.new_line();
        this.key_triggered_button("Go Left", ["a"],
            // function that gets called when A is pressed
            function () {
                this.buttons[0] = 1;
                this.xdir = -1;
            },
            '#6E6460',
            // function that's called when A is released
            function () {
                this.buttons[0] = 0;
                if (this.buttons[1] === 1)
                    this.xdir = 1;
                else
                    this.xdir = 0;
            });
        
        this.key_triggered_button("Decelerate", ["s"],
            function () {
                this.buttons[3] = 1;
                this.ydir = 0.25;
            },
            '#6E6460',
            function () {
                this.buttons[3] = 0;
                if (this.buttons[2] === 1)
                    this.ydir = 2;
                else
                    this.ydir = 1;
            });
        
        this.key_triggered_button("Go Right", ["d"],
            function () {
                this.buttons[1] = 1;
                this.xdir = 1;
            },
            '#6E6460',
            function () {
                this.buttons[1] = 0;
                if (this.buttons[0] === 1)
                    this.xdir = -1;
                else
                    this.xdir = 0;
            });  
        this.new_line();
        this.new_line();
        this.live_string(box => {
            box.textContent = "Score: " + this.score;
        });
    }

    drawRoad(context,program_state) {
        //Draw a long rectangle and animate a moving road through a shader
        this.shapes.road.draw(context, program_state, Mat4.identity()
                                                        .times(Mat4.translation(0,0,this.tiles*-2))
                                                        .times(Mat4.scale(this.roadWidth, 0.125, this.roadDepth*this.tiles)),
            this.materials.road.override({y_speed: 3.0*this.ydir_lerped*Math.min(1 - this.collision, 1 - this.pause)}));
    }

    drawRocks(context, program_state, speed) {
        //Draw collidable objects on both sides of the road

        //Left side of the road
        this.rock_positionsL.forEach((p, i) => {
            if (i % 5 === 0) //Every 5th object draw a statue
                this.shapes.statue.draw(context, program_state, Mat4.translation(...p).times(
                    Mat4.rotation(i*Math.PI/5, 0,1,0).times(
                        Mat4.scale(2, 2,2)
                    )),
                    this.materials.statue);
            else if (i % 11 == 0) //Every 11th object draw a tree
                this.shapes.tree.draw(context, program_state, Mat4.translation(...p).times(
                    Mat4.rotation(i*Math.PI/5, 0.1,1,0).times(
                        Mat4.translation(0, 4,0).times(
                            Mat4.scale(2, 2,2)
                    ))),
                    this.materials.tree);
            else //Otherwise draw a rock
                this.shapes.rock.draw(context, program_state, Mat4.translation(...p).times(
                    Mat4.rotation(i*Math.PI/5, 0,1,0)),
                    this.materials.rock);
        });

        //Right side of the road
        this.rock_positionsR.forEach((p, i) => {
            if (i % 5 === 0) // statue
                this.shapes.statue.draw(context, program_state, Mat4.translation(...p).times(
                    Mat4.rotation(i*Math.PI/5, 0,1,0).times(
                        Mat4.scale(2, 2,2)
                    )),
                    this.materials.statue);
            else if (i % 11 == 0) // tree
                this.shapes.tree.draw(context, program_state, Mat4.translation(...p).times(
                    Mat4.rotation(i*Math.PI/5, 0.1,1,0).times(
                        Mat4.translation(0, 4,0).times(
                            Mat4.scale(2, 2,2)
                    ))),
                    this.materials.tree);
            else
                this.shapes.rock.draw(context, program_state, Mat4.translation(...p).times(
                    Mat4.rotation(i*Math.PI/5, 0,1,0)),
                    this.materials.rock);
        });

        //Only move collidable object when not paused or collided
        if(this.pause == 0 && !this.collision) {
            //Move the rocks backwards at the same rate as the road
            this.rock_positionsL.forEach((p,i,a) => {
                a[i] = p.plus(vec3(0,0,speed));
                if (a[i][2] >= 2*this.roadDepth*2) a[i][2] = (-this.tiles+2)*this.roadDepth*2 + speed;
            });
            this.rock_positionsR.forEach((p,i,a) => {
                a[i] = p.plus(vec3(0,0,speed));
                if (a[i][2] >= 2*this.roadDepth*2) a[i][2] = (-this.tiles+2)*this.roadDepth*2 + speed;
            });
        }
    }

    drawCoins(context, program_state, angle, speed) {
        
        this.coin_positions.forEach((p, i) => {
            if(this.coin_active[i]) {
                this.shapes.coin.draw(context, program_state, Mat4.identity()
                .times(Mat4.translation(...p))
                .times(Mat4.scale(0.5,0.5,0.5))
                .times(Mat4.rotation(angle, 0,1,0)),
                 this.materials.coin);
            }
        })
        
        //Only move coins when not paused or collided
        if(this.pause == 0 && !this.collision) {
            //Move the coins backwards at the same rate as the road
            this.coin_positions.forEach((p,i,a) => {
                a[i] = p.plus(vec3(0,0,speed));
                if (a[i][2] >= 5*this.roadDepth*2) {
                    a[i][2] = (-this.tiles+2)*this.roadDepth*2 + speed;
                    this.coin_active[i] = true;
                } 
            });
        }
    }


    drawCar(context, program_state) {
        // handle car position and drawing:
        this.xpos += this.xdir * 2 * program_state.animation_delta_time / 1000;
        if (this.xpos < -3.5 || this.xpos > 3.5)
            this.outofbound = 1;
        else
            this.outofbound = 0;
        // linear interpolation from current angle to intended angle
        this.y_angle = (-this.xdir*(10 / this.ydir * this.ydir_lerped) - this.y_angle)*0.1 + this.y_angle;

        // linear interpolation of ydir
        if (this.ydir > this.ydir_lerped)
            this.ydir_lerped = (this.ydir - this.ydir_lerped)*0.1 + this.ydir_lerped;
        else if (this.ydir < this.ydir_lerped)
            this.ydir_lerped -= program_state.animation_delta_time / 1000;

        //Pulled defined dimensions of the car collider out of Out Of Bounds collision section
        let car_xmin = this.xpos - 0.5;
        let car_xmax = this.xpos + 0.5;
        let car_zmin = 4; // because the car never moves in the z-dir
       
        //Collision detection for coins
        this.coin_positions.forEach((p,i,a) => {
            let coin_xmin = a[i][0] - 0.5;
            let coin_xmax = a[i][0] + 0.5;
            let coin_zmin = a[i][2] - 0.5;
            let coin_zmax = a[i][2] + 0.5;

            if(this.coin_active[i]) {
                if (coin_zmin < car_zmin && coin_zmax > car_zmin) {
                    if (!(coin_xmax < car_xmin || coin_xmin > car_xmax)) {
                        this.coin_active[i] = false;
                        this.score++;
                    }
                }
            }   
        });
     


        if (this.outofbound) {
            // collision time, baby
            // check against the position of every rock.
            // each rock has an xmin and xmax. the car also has an xmin and xmax.
            // each rock has a zmin and zmax. if zmin < front of car < zmax, then we have a z-collison.
            this.collision = 0;

            this.rock_positionsL.forEach((p, i, a) => {
                let rock_xmin = a[i][0] - 1;
                let rock_xmax = a[i][0] + 1;
                let rock_zmin = a[i][2] - 1;
                let rock_zmax = a[i][2] + 1;
                if (rock_zmin < car_zmin && rock_zmax > car_zmin) // collision on z-axis
                {
                    if (!(rock_xmax < car_xmin || rock_xmin > car_xmax)) {
                        this.collision = 1;
                    }
                }
            });

            if (!this.collision)
                this.rock_positionsR.forEach((p, i, a) => {
                    let rock_xmin = a[i][0] - 1;
                    let rock_xmax = a[i][0] + 1;
                    let rock_zmin = a[i][2] - 1;
                    let rock_zmax = a[i][2] + 1;
                    if (rock_zmin < car_zmin && rock_zmax > car_zmin) // collision on z-axis
                    {
                        if (!(rock_xmax < car_xmin || rock_xmin > car_xmax)) {
                            this.collision = 1;
                        }
                    }
                });

            this.shapes.toyota.draw(context, program_state, Mat4.identity().times(
                Mat4.translation(this.xpos, 0.45, 4).times(
                    Mat4.rotation(this.y_angle / 360 * 2 * Math.PI, 0, 1, 0.5 - this.ydir_lerped).times(
                        Mat4.scale(1.25, 1.25, 1.25)
                    ))),
                this.materials.car);
        }
        else
            this.shapes.toyota.draw(context, program_state, Mat4.identity().times(
                Mat4.translation(this.xpos, 0.5, 4).times(
                    Mat4.rotation(this.y_angle / 360 * 2 * Math.PI, 0, 1, 0).times(
                        Mat4.scale(1.25, 1.25, 1.25)
                    ))),
                this.materials.car);

    }

    display(context, program_state) {
        program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, 1, 500);
        //Index 0: World Light Source, Index 1: Player Light Source
        program_state.lights = [new Light(vec4(0, 50, -50, 0), color(1, 1, 1, 1), 20000), new Light(vec4(0,5,0,1), color(1,1,1,1), 1)];

        if (!context.scratchpad.controls) {
            // program_state.set_camera(Mat4.look_at(vec3(this.xpos, 2.5, 10), vec3(this.xpos, 0, -4), vec3(0, 1, 0)));
            // this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
        }
        program_state.set_camera(Mat4.look_at(vec3(this.xpos, 2.0, 10 + 2*(this.ydir_lerped - 0.5)), vec3(this.xpos, 0, -4), vec3(0, 1, 0)));

        if (!program_state.animate || program_state.animation_delta_time > 500)
            return;

        let t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;

        //Time dependent variables
        const coinAngle = 20*2*Math.PI*t/60
        const speed = program_state.animation_delta_time / (50 / this.ydir_lerped);

        //Scaling variables
        const groundScale = -(-this.tiles+1)*this.roadDepth*2;
        const skyRadius = -(-this.tiles+3)*this.roadDepth*2;


        this.drawCar(context, program_state);

        this.drawRoad(context,program_state);

        //Draw moving objects in the scene
        this.drawCoins(context, program_state, coinAngle, speed);
        this.drawRocks(context, program_state, speed);
    
        //Draw the ground separate from the road
        this.shapes.cube.draw(context, program_state,
            Mat4.identity().times(Mat4.translation(0,-0.1,0)).times(Mat4.scale(groundScale,0.1,groundScale)),
            this.materials.ground.override({y_speed: 3.0*this.ydir_lerped*Math.min(1 - this.collision, 1 - this.pause)}));

        //Draw the sky surrounding the scene
        this.shapes.sky.draw(context, program_state, Mat4.identity().times(Mat4.scale(skyRadius,skyRadius,skyRadius)), this.materials.sky);

        // Draw 2D planes in the distance
        this.shapes.plane.draw(context, program_state, Mat4.identity().times(
            Mat4.translation(-75 + Math.cos(t / 2) * 2,10, -450).times(
                Mat4.scale(145, 125, 1)
            )),
            this.materials.cloud1);
        this.shapes.plane.draw(context, program_state, Mat4.identity().times(
            Mat4.translation(50 + Math.sin(t / 2) * 2,5, -451).times(
                Mat4.scale(60, 50, 1)
            )),
            this.materials.cloud1);
        this.shapes.plane.draw(context, program_state, Mat4.identity().times(
            Mat4.translation(-200 + Math.sin(t / 2) * 2,10, -400).times(
                Mat4.scale(40, 30, 1)
            )),
            this.materials.cloud1);
        this.shapes.plane.draw(context, program_state, Mat4.identity().times(
            Mat4.translation(-160, Math.sin(t / 2) * 2, -410).times(
                Mat4.scale(30, 30, 1)
            )),
            this.materials.sun);
        this.shapes.city.draw(context, program_state, Mat4.identity().times(
            Mat4.translation(100, 0, -500).times(
                Mat4.scale(40, 30, 40)
            )),
            this.materials.city);
        this.shapes.city.draw(context, program_state, Mat4.identity().times(
            Mat4.translation(200, 0, -450).times(
                Mat4.scale(40, 30, 40)
            )),
            this.materials.city);
    }

    show_explanation(document_element) {
            //document_element.innerHTML += `<p> Did you know? The infinite road aesthetic is inspired by the paintings of Hiroshi Nagai, a Japanese painter whose work is experiencing a surge in popularity due to the Internet's discovery of the city pop genre. </p>`;

    }
}

class Texture_Scroll_Y extends Textured_Phong {
    // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #6.
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            
            void main(){
                // Sample the texture image in the correct place:
                vec2 cur_coord = vec2(f_tex_coord[0], f_tex_coord[1] - 0.01*(mod(animation_time, 100.0)));
                vec4 tex_color = texture2D( texture, cur_coord);
                if( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}

class RoadShader extends Textured_Phong {
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform sampler2D bump_map;
            uniform float y_scale;
            uniform float y_speed;
            uniform float animation_time;
            uniform float y_stop;
            
            void main(){
                // Sample the texture image in the correct place:
                vec2 cur_coord = vec2(f_tex_coord[0], y_scale*f_tex_coord[1] - y_speed*(mod(animation_time, 20.0)));
                vec3 normal = N;
                vec3 pos = vertex_worldspace;
                
                vec4 tex_color = texture2D( texture, cur_coord);
                if( tex_color.w < .01 ) discard;
                float rand = sin(fract(1000.0*(sin(vertex_worldspace.z) + cos(tex_color.g))));
                rand *= sign(rand);
                if (rand > 0.5)
                    rand = 1.0;
                else
                    rand = 0.0;
                normal += tex_color.rgb * rand;
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                
                float light_color = phong_model_lights( normalize( normal ), vertex_worldspace ).r;
                // inverse distance from this.xpos, 0, 4
                vec3 carpos = vec3(camera_center.x, 0, 4.0);
                float darkfactor = distance(carpos, vertex_worldspace) / 2.0;
                if (darkfactor > 1.0) darkfactor = 1.0;
                gl_FragColor.xyz *= darkfactor;
                gl_FragColor.xyz += light_color * rand * darkfactor;
        } `;
    }

    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Add a little more to the base class's version of this method.
        super.update_GPU(context, gpu_addresses, gpu_state, model_transform, material);

        //Provides access to user-defined y_scale
        context.uniform1f(gpu_addresses.y_scale, material.y_scale);
        context.uniform1f(gpu_addresses.y_speed, material.y_speed);
    }

}

class CarShader extends Textured_Phong {
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            
            void main(){
                // Sample the texture image in the correct place:
                vec2 cur_coord = vec2(f_tex_coord[0], f_tex_coord[1]);
                vec4 tex_color = texture2D( texture, cur_coord);
                if( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                float light_color = phong_model_lights( normalize( N ), vertex_worldspace ).r;
                if (light_color < 0.4)
                    if (light_color < 0.2)
                        light_color = 0.0;
                    else
                        light_color = 0.2;
                else
                    light_color = 0.8;
                gl_FragColor.xyz += tex_color.rgb * light_color;
                if (vertex_worldspace.y < 1.0)
                    gl_FragColor.xyz *= vertex_worldspace.y; 
        } `;
    }

    /* update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Add a little more to the base class's version of this method.
        super.update_GPU(context, gpu_addresses, gpu_state, model_transform, material);
        //Provides access to user-defined y_scale
        context.uniform1f(gpu_addresses.y_scale, material.y_scale);
    } */

}

class FlatShader extends Textured_Phong {

    // TODO:  Modify the shader below (right now it's just the same fragment shader as Textured_Phong) for requirement #6.
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            
            void main(){
                // Sample the texture image in the correct place:
                vec2 cur_coord = vec2(f_tex_coord[0], f_tex_coord[1]);       
                vec4 tex_color = texture2D( texture, cur_coord);
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}