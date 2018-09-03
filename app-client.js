/******************************************************/
/*Attaching the required modules and create variables */
/******************************************************/
var express = require("express");
var opcua = require("node-opcua");
var async = require("async");
var port = 3700;
var tgtlvl= 6.5;
var kp = 1.7; //Tuned at 1.7
var getL=0;
var getV=0;
var setV = 0;
var client = new opcua.OPCUAClient({
        requestedSessionTimeout: 3000000 //milliseconds (default was 3000x1000 milliseconds )
});
var endpointUrl = "opc.tcp://RON-LAPTOP:3003/MyLittleServer";
var the_session,the_subscription,LevelNodeId, TankCtrlNodeId, startExpeNodeId, getLevelNodeId, ValveNodeId, setValveNodeId=0;
/*****************************************************/
/* Sequential execution of OPC UA by "series"        */
/*****************************************************/
async.series([
        /*****************************************************/
        /* Step 1 : Connect to OPC Server                    */
        /*****************************************************/
        function(callback)  {
            client.connect(endpointUrl, function (err) {
                if(err) {
                    console.log("Cannot connect to server :" , endpointUrl );
                } else {
                    console.log("Connected to OPC UA Server at: "+ endpointUrl);
                }
                callback(err);
            });
        },
        /*****************************************************/
        // Step 2 : Create Session                           */
        /*****************************************************/
        function(callback1) {
            client.createSession( function(err, session) {
                if(!err) {
                    the_session = session;
                    console.log("session created");
                    console.log("the timeout value set by the server is ",  session.timeout ," ms");
                }
                else {
                    console.log("cannot create a session");
                }
                callback1(err);
            });
        },
        /******************************************************/
        /* Step 3: Browse node ID of TankController           */
        /******************************************************/
        function (callback) {
            var path  = opcua.makeBrowsePath("RootFolder","/Objects/TankController");
            the_session.translateBrowsePath(path,function(err,results){
                if (!err) {
                    if (results.targets.length > 0){
                        TankCtrlNodeId = results.targets[0].targetId;
                        console.log("TankController -> nodeID is:    "+TankCtrlNodeId.value);
                    } else {
                        console.log("Cannot find TankController - ",results.toString());
                        err = new Error("cannot find TankController");
                    }
                }
                else {
                    console.log("Error:",err.toString());
                }
                callback(err);
            })
        },
        /******************************************************************************************/
        /*Step 4 : Create subscription object and its responses to be logged in console           */
        /******************************************************************************************/
        function(callback) {
            the_subscription=new opcua.ClientSubscription(the_session,{
                requestedPublishingInterval: 100,
                requestedMaxKeepAliveCount:  500,
                requestedLifetimeCount:      600,
                maxNotificationsPerPublish:  1,
                publishingEnabled: true,
                priority: 10
            });
            the_subscription.on("started",function(){
                console.log("Subscription created");
                callback();
            }).on("keepalive",function(){
                console.log("Keepalive");
            }).on("terminated",function(){
                console.log(" TERMINATED ------------------------------>")
            });
        },
        /**********************************************************************/
        /*Step 5: List variables and methods available on TankController      */
        /**********************************************************************/
        function(callback) {
            the_session.browse(TankCtrlNodeId, function(err, browseResult) {
                if(!err) {
                    browseResult.references.forEach( function(reference) {
                        console.log('Element:' + reference.browseName + ', is a:' + reference.nodeClass.key);
                    });
                }
                callback(err);
            });
        },
        /*****************************************************************************/
        /*Step 6: Browse node ID for methods and variables to be used in control     */
        /*****************************************************************************/
        function (callback) {
            var pathSE  = opcua.makeBrowsePath(TankCtrlNodeId,".startExperiment");
            var pathGL  = opcua.makeBrowsePath(TankCtrlNodeId,".getLevel");
            var pathSV  = opcua.makeBrowsePath(TankCtrlNodeId,".setValve");
            var pathV  = opcua.makeBrowsePath(TankCtrlNodeId,".Valve");
            var pathL  = opcua.makeBrowsePath(TankCtrlNodeId,".Level");
            var errors;
            the_session.translateBrowsePath(pathSE,function(err2,results2) {
                if (!err2) {
                    if (results2.targets.length > 0) {
                        startExpeNodeId = results2.targets[0].targetId;
                        console.log("\nstartExperiment -> nodeID is:    "+startExpeNodeId);
                    } else {
                        console.log("cannot find MethodIO", results2.toString());
                        err2 = new Error(" cannot find MethodIO");
                        errors=errors+err2+", ";
                    }
                }
            });
            the_session.translateBrowsePath(pathGL,function(err3,results3) {
                if (!err3) {
                    if (results3.targets.length > 0) {
                        getLevelNodeId = results3.targets[0].targetId;
                        console.log("getLevel -> nodeID is:   "+getLevelNodeId);
                    } else {
                        console.log("cannot find MethodIO", results3.toString());
                        err3 = new Error(" cannot find MethodIO");
                        errors=errors+err3+", ";
                    }
                }
            });
            the_session.translateBrowsePath(pathSV,function(err4,results4) {
                if (!err4) {
                    if (results4.targets.length > 0) {
                        setValveNodeId = results4.targets[0].targetId;
                        console.log("setValve -> nodeID is:    "+setValveNodeId);
                    } else {
                        // cannot find objectWithMethodNodeId
                        console.log("cannot find MethodIO", results4.toString());
                        err4 = new Error(" cannot find MethodIO");
                        errors=errors+err4+", ";
                    }
                }
            });
            the_session.translateBrowsePath(pathV,function(err5,results5) {
                if (!err5) {
                    if (results5.targets.length > 0) {
                        ValveNodeId = results5.targets[0].targetId;
                        console.log("setValve -> nodeID is:    "+ValveNodeId);
                    } else {
                        // cannot find objectWithMethodNodeId
                        console.log("cannot find MethodIO", results5.toString());
                        err5 = new Error(" cannot find MethodIO");
                        errors=errors+err5+", ";
                    }
                }
            });
            the_session.translateBrowsePath(pathL,function(err6,results6) {
                if (!err6) {
                    if (results6.targets.length > 0) {
                        LevelNodeId = results6.targets[0].targetId;
                        console.log("Level -> nodeID is:   "+LevelNodeId);
                    } else {
                        console.log("cannot find VariableIO", results6.toString());
                        err6 = new Error(" cannot find VariableIO");
                        errors=errors+err6+", ";
                    }
                }
                callback(errors);
            });

        },
        /**********************************************************************/
        /* Step 7 : Start experiment (call method)                            */
        /**********************************************************************/
        function(callback) {
            var methodToCalls = [{
                objectId: TankCtrlNodeId,
                methodId: startExpeNodeId
            }];
            the_session.call(methodToCalls, function (err, results) {
                if (!err) {
                    console.log("\nExperiment started successfully");
                }
                callback(err);
            })
        }],
        /**********************************************************************/
        /* Step 8 : Start HTTP Server - UI and control function               */
        /**********************************************************************/
        function(err) {
        if (!err) {
            startHTTPServer();
        } else {
            console.log(err);}
        });

/*******************************************************/
/* Step 9 : Setup HTTP Server                          */
/*******************************************************/
function startHTTPServer() {

    /* Step 9.1 : Link HTML to get request            */

    var app = express();
    app.get("/", function(req, res){
        res.sendFile(__dirname + "/" + "index.html");
    });
    app.use(express.static(__dirname + '/'));

    /* Step 9.2 : Setup socket.io (backend - frontend data connection) */

    var io = require('socket.io').listen(app.listen(port));
    console.log("UI on port " + port);
    io.sockets.on('connection', function (socket) {
        console.log("UI connected");
    });

    /* Step 9.3 : Create object to subscribe for Level */

    var monitoredItemLvl = the_subscription.monitor({
            nodeId: opcua.resolveNodeId(LevelNodeId),
            attributeId: opcua.AttributeIds.Value
        },
        {
            samplingInterval: 100,
            discardOldest: true,
            queueSize: 1
        }
    );

    /* Step 9.4 : Create object to subscribe for Valve */

    var monitoredItemVlv = the_subscription.monitor({
            nodeId: opcua.resolveNodeId(ValveNodeId),
            attributeId: opcua.AttributeIds.Value
        },
        {
            samplingInterval: 100,
            discardOldest: true,
            queueSize: 1
        }
    );
    console.log("-------------------------------------");

    /* Step 9.4 : Subscription handler, capture variable "Valve" every change event */

    monitoredItemVlv.on("changed", function (dataValueVlv) {

        /* Step 9.4.1 : Get "Valve" value */

        getV=dataValueVlv.value.value;

        /* Step 9.4.2 : Forward data to UI */

        io.sockets.emit('event', {waterL: getL,ValveL: getV});

    });

    /* Step 9.5 : Subscription handler, capture variable "Level" every change event, executes control and set valve */

    monitoredItemLvl.on("changed", function (dataValueLvl) {

        /* Step 9.5.1 : Get "Level" value */

        getL=dataValueLvl.value.value;
        console.log("Tank level = ", (getL*10).toFixed(2), " %");

        /* Step 9.5.2 : Proportional control calculation */

        setV=kp*(1-(((tgtlvl-getL)+10)/20));

        /* Step 9.5.3 : Set new value for "Valve" calling a method */

        var methodToCalls = [{
            objectId: TankCtrlNodeId,
            methodId: setValveNodeId,
            inputArguments:[
                {
                    dataType: opcua.DataType.Float,
                    value: 0
                }
            ]
        }];
        methodToCalls[0].inputArguments[0].value=setV;
        the_session.call(methodToCalls, function (err, results) {
        });

        /* Step 9.5.4 : Forward data to UI */

        io.sockets.emit('event', {waterL: getL,ValveL: getV});

    });
}