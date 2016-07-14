'use strict';
//branching alg

//single start node 
//grow upwards certain height based on "enviromental" factors
//Trunk? or should it just split like a fractal? 
    //single trunk that gets smaller as it grows
//at certain points branches will form following the same rules as the trunk
//at a certain size leaves will appear instead of branches
//branch point in plotted, once that happens the branch starts to grow towards it
    //FUN NOTE: Maybe obsticales?!?
var SEC_IN_MILISECONDS = 1000;
var FPS =60;
var STARTING_GROWTH_RATE = 2;
var decayRate = 1;
var SPAWN_MAX = 2;
var MAX_NODES = 500;
var canvas;
var context;
var animationTimer; 


var sunlight = 1;
var water = 1;

var tree;
var scale;


var leaves = false;
var color = false;
var obsticles = false;
var wireframe = false;




class Tree
{
    constructor()
    {
        this.growthTimer = 0.0;
        this.spawnTimer = 0.0;
        //array of nodes
        this.nodes = [];
        this.ghosts = [];
        //constructor       (id,    x,             y,            size,parent,growthRate,           direction,slope,tree)
        this.root = new Node("Root",canvas.width/2,canvas.height - 1,1,null, 0,0,{ x: 0, y: 0});
        //constructor                 (id,              x,             y,                size,parent,growthRate,           direction,slope,tree)
        this.apicalMeristem = new Node("ApicalMeristem",canvas.width/2,canvas.height - 2,1,this.root,STARTING_GROWTH_RATE, 1,{ x: 0, y: -1},this,0);
        //spawn the first true node
        var children = this.apicalMeristem.spawnChildren();
        this.nodes.push(children[0]);

    }
    branch()
    {
        var newNodes = []
        for(var n in this.nodes)
        {
            if(this.nodes[n].spawnCheck())
            {
                var nodeBuffer = this.nodes[n].spawnChildren();
                for(var node in nodeBuffer)
                {
                    newNodes.push(nodeBuffer[node]);
                }
            }     
        }

        for(var newN in newNodes)
        {
            this.nodes.push(newNodes[newN]);
        }
    }
    grow()
    {
        if(this.nodes.length + this.ghosts.length < MAX_NODES)
        {
            this.growthTimer++;
            this.spawnTimer++;
            if(this.growthTimer > SEC_IN_MILISECONDS/FPS)
            {
                this.apicalMeristem.offset.size += (0.2 * scale);
                this.apicalMeristem.size += 0.2;

                  
                    for(var n in this.nodes)
                    {
                        if(!this.nodes[n].static)
                        {
                            this.nodes[n].grow();
                        }
                        else
                        {
                            this.nodes[n].id = "Ghost";
                            this.ghosts.push(this.nodes[n]);
                            this.nodes.splice(n,1); 
                            n--;
                        }                        
                    }

                   

                    

                this.growthTimer = 0;
                for(var g in this.ghosts)
                {
                    this.ghosts[g].grow();
                }
            }
            if(this.spawnTimer > (SEC_IN_MILISECONDS/FPS)*5)
            {
                this.branch();
                this.spawnTimer = 0;
            }
        }
        else
        {
            pause();
            var leavesArr = [];
            for(var n in this.nodes)
            {
                
                this.nodes[n].id = "Ghost";
                if(leaves)
                {
                    leavesArr.push(this.nodes[n]);
                }
                this.ghosts.push(this.nodes[n]);
            }
            this.nodes = []
            drawBackground();
            this.draw();
            if(leaves)
            {
                for(var l in leavesArr)
                {
                    drawLeaf(leavesArr[l]);
                }
            }
            $("#pause").attr("disabled", "true");
            
        }


    }

    scale(sc)
    {
        this.apicalMeristem.scale(sc);
        for(var n in this.nodes)
        {
            this.nodes[n].scale(sc);
        }
    }

    draw()
    {
        //draw lines between nodes 
        //drawTrunk(this.nodes[0].offset,this.apicalMeristem.offset);
        for(var n in this.nodes)
        {
            
            drawLine(this.nodes[n].offset,this.nodes[n].parent.offset);
            drawCircle(this.nodes[n]);
        }

        for(var g in this.ghosts)
        {
            drawLine(this.ghosts[g].offset,this.ghosts[g].parent.offset);
            //drawCircle(this.ghosts[g]);
        }

    }



}

class Node
{
    constructor(id,x,y,size,parent, growthRate,direction,slope,tree,gen)
    {

        if(parent != null)
        {
            this.parent = parent; // the node that spawned this node  
        }   
        this.x = x;
        this.y = y;
        this.size = size;
        this.id = id;
        this.children = [];
        this.growthRate = growthRate;
        this.growthX = 0; // how far along the x axis the node moves 
        this.growthY = 0; // how far along the y axis the node moves
        this.hasChild = false;
        this.direction = direction;
        this.slope = slope;
        this.tree = tree;
        this.health = 100;
        this.static = false;
        this.offset = {
            x: this.x,
            y: this.y,
            size: this.size
        };

        if(this.id != "Root" && this.id != "ApicalMeristem")
        {
            this.scale(scale);
        }
    }
    getDistanceFromMeristem()
    {
        var ret = {
            found: false,
            distance: 0.0
        }
        var meristemFound = false;
        while(!ret.found)
        {
            //for each child
            for(var child in this.children)
            {

                if(this.children[child].id != "Meristem")
                {
                    ret.found = this.children[child].getDistanceFromMeristem().found;
                    ret.distance += this.children[child].getDistanceFromMeristem().distance + 1;
                    if(meristemFound)
                    {
                        break;
                    }
                }
                else
                {
                    ret.found = true;
                    ret.distance += 1;
                    break;  
                }
            }
           
        }
        return ret
    }
    getDistanceFromParent()
    {
        //get the dx and dy, calc distance (check code from games)
        var dx;
        var dy;
        dx = this.x  - this.parent.x;
        dy = this.y  - this.parent.y;
        var dis = Math.sqrt(Math.pow(dx,2)+Math.pow(dy,2));

        //dis -= this.size;
        //dis -= this.parent.size;

        return dis
    }

    getCurrentSlope(x1,y1,x2,y2)
    {
        //Find the slope of the line 
        
        var slopeX = (x1 - x2);
        var slopeY = (y1 - y2);
        var isDivisible = true;
        var factor = 1;
        var order = {
            first: {
                axis: "",
                value: 0
            },
            second: {
                axis: "",
                value: 0
            }
        }
        var slope  = {
            x: 0,
            y: 0
        };

        if(slopeX < 0)
        {
            slopeX *= -1;
        } 

        if(slopeY < 0)
        {
            slopeY *= -1;
        } 

        if(slopeX < slopeY)
        {
            order.first.axis = "x";
            order.first.value = slopeX;
            order.second.axis = "y";
            order.second.value = slopeY;
        }
        else
        {
            order.first.axis = "y";
            order.first.value = slopeY;
            order.second.axis = "x";
            order.second.value = slopeX;
        }

        while(isDivisible)
        {   
            var temp = order.first.value/factor;
            var tempSecond = order.second.value/factor;
            
            if(temp > 0 && tempSecond > 1)
            {
                factor++;
            }
            else
            {
                if(factor > 1)
                {
                    factor--;
                    order.second.value = order.second.value/factor;
                }
                else
                {
                    order.second.value = 1;
                }
                order.first.value = order.first.value/factor;
                isDivisible = false;

            }
        }

        if(order.first.axis == "x")
        {
            slope = {
                x: order.first.value,
                y: order.second.value
            };
        }
        else
        {
            slope = {
                x: order.second.value,
                y: order.first.value
            };
        }



        return slope
    }

    //Come back to this and make it more organic
    getGrowthPotential()
    {

        var potential = 0.0;
        

        //The plant should have higher potential the lower its health.
        //this will create shorter, stumpier plants when there is no water or sun.

        if(this.health != 0)
        {
        
        
            var healthWeighting = ((100 - this.health)/100)

            if(this.id == "Bud")
            {
                var distance = 0;
                var distanceFromMeristem = this.getDistanceFromMeristem().distance;


                potential = (distanceFromMeristem * 0.1) + healthWeighting;
                
            }
            else
            {
                var distance = 0;
                var distanceFromParent = this.getDistanceFromParent();
                var parentDistanceFromParent = this.parent.getDistanceFromParent();

                var distanceFactor = distanceFromParent/parentDistanceFromParent;

                potential = distanceFactor + healthWeighting;
                
            }
        }

        

        return potential;
    }
    scale(sc)
    {
        if(this.id == "Ghost")
        {
            this.size += 0.2;
        }
        this.offset.size = this.size * sc;

        var disX = this.x - this.tree.root.x;
        var disY = this.y - this.tree.root.y;

        this.offset.x = (disX * sc) + this.tree.root.x; 
        this.offset.y = (disY * sc) + this.tree.root.y;

        if(this.offset.x > canvas.width || this.offset.x < 0 || this.offset.y < 0 )
        {
            if((scale - 0.2) > 0)
            {
                setScale(scale - 0.2);
            }
            
        }


    }
    grow()
    {

        //I should grow based on slope


        
        if(this.slope.x != 0)
        {
            this.growthX = this.parent.growthX + (this.growthRate * this.slope.x) * this.direction;
        }

        this.growthY = this.parent.growthY + (this.slope.y * this.growthRate);

        this.x += this.growthX;
        this.y -= this.growthY;
        
        

        //change this to organic value
        this.size += 0.2;

        this.scale(scale);
    

       
        
    }

    spawnCheck()
    {
        //check if the node should spawn children

        if(!this.hasChild)
        {
            
            var roll = Math.random();
            var potential = this.getGrowthPotential();
            
            if(roll < potential)
            {
                return true
            }
            
        }
        else
        {
            if(this.getDistanceFromMeristem().distance >= 3)
            {
                this.setStaticToTrue();
            }
        }
        return false 
    }

    branch()
    {
        /*
            - create multiple nodes 
            - one node on each side of the bud
                - for this i need to use my normalization code to get the points on either side 
        */

        var numberOfChildren = (Math.random() * 2) + 1;
        //vectors 1 and 3
        var vects = getPolygonVerts(this,this.parent);
        var children = [];
        var side;

        this.id = "Branch";

        for(var i = 0; i < 2; i++)
        {

            side = Math.round(Math.random());
            var id = "Meristem";
            var x;
            var y;
            var size;
            var direction;
            var slope = {
                x: 0,
                y: 0
            };

            
            //add some kind of deviation

            var deviation = {
                x: 0,
                y: 0
            }
            if(i == 0)
            {
                x = vects.n1.v1.x;
                y = vects.n1.v1.y;
            }
            else
            {
                x = vects.n1.v2.x;
                y = vects.n1.v2.y;
            }
            slope = this.getCurrentSlope(x,y,vects.n1.v4.x,vects.n1.v4.y);
            deviation.x = (Math.random()*(0.2 - 0.01) + 0.01);
            deviation.y = (Math.random()*(0.6 - 0.1) + 0.1);

            if(Math.round(Math.random()) == 1)
            {
                slope.x -= deviation.x;
            }
            else
            {
                slope.x += deviation.x;
                
            }
            slope.y += deviation.y;
            if(x > this.x)
            {
                direction = 1;
            }
            else
            {
                direction = -1;
            }

            
            size = this.size * 0.2;
            var gen = this.gen + 1;


            var newNode = new Node(id,x,y,size,this,this.growthRate,direction,slope, this.tree, gen);
            var health = this.health - (decayRate + (decayRate - (water+sunlight/2)));

            if(health <= 0)
            {
                newNode.health = 0;
            }
            newNode.grow();
            this.hasChild = true;
            children.push(newNode);
            this.children.push(newNode);
        }
        return children


    }

    extend()
    {
        /*
            - create one node
            - the node spawns at the same slope of the preveious node
                - maybe a possible random deviation?

        */
        var children = [];
        
        if(this.id != "ApicalMeristem")
        {
            this.id = "Bud";
        }
        var id = "Meristem";
        var gen = this.gen + 1;
        var x;
        var y;
        var size;
        var direction;

        var slope = {
            x: 0,
            y: 0
        };
        var deviation = {
                x: 0,
                y: 0
            }
        deviation.x = (Math.random()*(0.2 - 0.01) + 0.01);
        deviation.y = (Math.random()*(0.2 - 0.01) + 0.01);

        if(Math.round(Math.random()) == 1)
        {
            slope.x -= deviation.x;
        }
        else
        {
            slope.x += deviation.x;
            
        }

        slope.y += deviation.y;
        
        // get the slop of the current branch
        slope = this.getCurrentSlope(this.x,this.y,this.parent.x,this.parent.y);

        //place the node on this node at the same slope
        if(this.x > this.parent.x)
        {
            direction = 1;
            x = this.x + slope.x;
        }
        else
        {
            direction = -1;
            x = this.x - slope.x;
        }
       
        y = this.y - slope.y;

        //make it 80% of the size
        size = this.size * 0.8;

        //TODO: deviate upwards slightly 

        var gen = this.gen + 2;
        


        var newNode = new Node(id,x,y,size,this,this.growthRate,direction,slope, this.tree, gen);
        var health = this.health - (decayRate + (decayRate - (water+sunlight/2)));

        if(health <= 0)
        {
            newNode.growthRate = 0;
        }
        children.push(newNode);
        this.children.push(newNode);
        return children;
    }
    spawnChildren()
    {
        var children = [];

        if(this.id == "Bud")
        {
            children = this.branch();
            
        }
        else if (this.id == "Meristem" || this.id == "ApicalMeristem" )
        {
            /*if(this.gen%this.tree.nodes.length == 4 || this.gen%this.tree.nodes.length == 5)
            {
                children = this.branch();
            }
            */
            children = this.extend();
        }
        
        return children
    }
    setStaticToTrue()
    {
        this.static = true;
    }
}


$(document).ready(function(){
    canvas = document.getElementById("myCanvas");
    context = canvas.getContext('2d');
    start();
})



function start()
{
    drawBackground();
    $("#pause").attr("disabled", false);
    tree = new Tree();
    scale = 1;

    if(animationTimer != undefined || animationTimer != null)
    {
        clearInterval(animationTimer);
        animationTimer = setInterval(mainLoop, SEC_IN_MILISECONDS/FPS);
    }
    else
    {
        animationTimer = setInterval(mainLoop, SEC_IN_MILISECONDS/FPS);
    }

    
}
function mainLoop()
{
    
    drawBackground();
    tree.grow();
    tree.draw();
}

function drawBackground()
{
    (function() {

        // resize the canvas to fill browser window dynamically
        window.addEventListener('resize', resizeCanvas, false);
        
        function resizeCanvas() {

                
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
                
                
                
                /**
                 * Your drawings need to be inside this function otherwise they will be reset when 
                 * you resize the browser window and the canvas goes will be cleared.
                 */
                drawStuff(); 
        }
        resizeCanvas();
        
        function drawStuff() {
                // do your drawing stuff here
        }
    })();
}

function drawLine(node1,node2)
{   
    //var vectors = getPolygonVerts(node1,node2);

    context.beginPath();
    context.moveTo(node1.x,node1.y);
    context.lineTo(node2.x,node2.y);
    context.lineWidth = node1.size;
    context.strokeStyle = "green";
    context.stroke();

    /*context.beginPath();
    context.moveTo(vectors.n1.v1.x,vectors.n1.v1.y);
    context.lineTo(vectors.n2.v1.x,vectors.n2.v1.y);
    context.lineWidth = node1.size/8;
    context.strokeStyle = "blue";
    context.stroke();

    context.beginPath();
    context.moveTo(vectors.n1.v3.x,vectors.n1.v3.y);
    context.lineTo(vectors.n1.v4.x,vectors.n1.v4.y);
    context.lineWidth = node1.size/8;
    context.strokeStyle = "blue";
    context.stroke();

    context.beginPath();
    context.moveTo(vectors.n1.v2.x,vectors.n1.v2.y);
    context.lineTo(vectors.n2.v2.x,vectors.n2.v2.y);
    context.lineWidth = node1.size/8;
    context.strokeStyle = "blue";
    context.stroke();*/

}

function drawCircle(node1)
{
    var color = "";

    switch(node1.id)
    {
        case "Bud":
            color = "green";
            break;
        case "Meristem":
            color = "red";
            break;
        case "Ghost":
            color = "white";
            break;
            default:
                color = "blue";

    }
   
    context.strokeStyle = color;
    context.fillStyle = "green";
    context.beginPath();
    
    context.lineWidth = 2;
    //draw arc
    context.arc(node1.offset.x,node1.offset.y,node1.offset.size,0,Math.PI*2,true)
    context.stroke();
    context.fill();

}

function drawLeaf(node)
{
    var color = "rgba(0,100,0,0.5)";

    context.strokeStyle = color;
    context.fillStyle = color;
    context.beginPath();
    
    context.lineWidth = 2;
    //draw arc
    context.arc(node.offset.x,node.offset.y,node.offset.size*10,0,Math.PI*2,true)
    context.stroke();
    context.fill();

}

function getPolygonVerts(node1,node2)
{
    var dx = node1.x - node2.x;
    var dy = node1.y - node2.y;

    var newX = -dy;
    var newY = dx;

    var magnitude = Math.sqrt(Math.pow(newX,2) + Math.pow(newY,2));

    //Normalized points (left and right of node)
    var vector1 = {
      x:newX/magnitude,
      y:newY/magnitude
    }


    var vector2 = {
      x:newX/magnitude,
      y:newY/magnitude
    }

    var vector3 = {
      x:newX/magnitude,
      y:newY/magnitude
    }

    var vector4 = {
      x:newX/magnitude,
      y:newY/magnitude
    }

    //Top and bottom of node

    dx = node1.x - node2.x;
    dy = node1.y - node2.y;

    newX = dx;
    newY = dy;

    magnitude = Math.sqrt(Math.pow(newX,2) + Math.pow(newY,2));

    var vector5 = {
      x:newX/magnitude,
      y:newY/magnitude
    }


    var vector6 = {
      x:newX/magnitude,
      y:newY/magnitude
    }

    var vector7 = {
      x:newX/magnitude,
      y:newY/magnitude
    }

    var vector8 = {
      x:newX/magnitude,
      y:newY/magnitude
    }


    //left and right
    vector1.x *= node1.size;
    vector1.y *= node1.size;

    vector2.x *= node2.size;
    vector2.y *= node2.size; 


    vector1.x += node1.x;
    vector1.y += node1.y;
    
    vector2.x += node2.x;
    vector2.y += node2.y; 


    vector3.x *= -node1.size;
    vector3.y *= -node1.size;

    vector4.x *= -node2.size;
    vector4.y *= -node2.size; 


    vector3.x += node1.x;
    vector3.y += node1.y;
    
    vector4.x += node2.x;
    vector4.y += node2.y; 

    //Top and bottom
    vector5.x *= node1.size;
    vector5.y *= node1.size;

    vector6.x *= node2.size;
    vector6.y *= node2.size; 


    vector5.x += node1.x;
    vector5.y += node1.y;
    
    vector6.x += node2.x;
    vector6.y += node2.y; 


    vector7.x *= -node1.size;
    vector7.y *= -node1.size;

    vector8.x *= -node2.size;
    vector8.y *= -node2.size; 


    vector7.x += node1.x;
    vector7.y += node1.y;
    
    vector8.x += node2.x;
    vector8.y += node2.y; 

    var vectors = {
        n1: {
            v1: null,
            v2: null,
            v3: null,
            v4: null
        },
        n2: {
            v1: null,
            v2: null,
            v3: null,
            v4: null
        },
    };

    vectors.n1.v1 = vector1;
    vectors.n1.v2 = vector3;

    vectors.n2.v1 = vector2;
    vectors.n2.v2 = vector4;


    vectors.n1.v3 = vector5;
    vectors.n1.v4 = vector7;

    vectors.n2.v3 = vector6;
    vectors.n2.v4 = vector8;





    return vectors
}

function setScale(sc)
{
    $("#zoomLabel").html(sc+"x");
    scale = sc;    
    tree.scale(sc);
}


function pause()
{
    if(animationTimer != undefined || animationTimer != null)
    {
        $("#pause").attr("value", "Resume");
        $("#pause").attr("onclick", "resume()");
        clearInterval(animationTimer);
        animationTimer = null;
        
    }
   
}

function resume()
{
    if(animationTimer == undefined || animationTimer == null)
    {
        $("#pause").attr("value", "Pause");
        $("#pause").attr("onclick", "pause()");
        animationTimer = setInterval(mainLoop, SEC_IN_MILISECONDS/FPS);
    }
   
}

function restart()
{
    start();
}


function setSpeed(speed)
{
    //set animation timer speed

    if(animationTimer != undefined || animationTimer != null)
    {
        
        clearInterval(animationTimer);
        animationTimer = null;
        
    }
    FPS = speed;
    if(animationTimer == undefined || animationTimer == null)
    {
        $("#speedLabel").html(speed+" fps");
        animationTimer = setInterval(mainLoop, SEC_IN_MILISECONDS/FPS);
    }

}

function setSize(size)
{
    //set max number of nodes?
    MAX_NODES = size;
    $("#sizeLabel").html(size+ " nodes")
}

function setWater(waterAmnt)
{
    water = waterAmnt;
}

function setSunlight(sunAmnt)
{
    sunlight = sunAmnt;
}


function setObsticles(val)
{

}

function setColors(val)
{

}

function toggleWireframe(val)
{
    wireframe = val;
}

function setLeaves(val)
{
    leaves = val;
}


function closeMenu()
{

    $("#menuItems").hide();
    $("#menu-bar").css("background-color", "rgba(0,0,0,0)");
    $("#arrow").attr("onclick", "openMenu()");
    $("#arrowText").html("Options");
}

function openMenu()
{
    $("#menuItems").show();
    $("#menu-bar").css("background-color", "rgba(30,30,30,1)");
    $("#arrow").attr("onclick", "closeMenu()");
    $("#arrowText").html("Close");
}

