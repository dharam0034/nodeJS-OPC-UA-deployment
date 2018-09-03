var Tank = require('water-tank')
var tank1 = new Tank(10, 2.5, 1, 0.013, 0.7, 0.60, 3001);
var opcua = require("node-opcua");

// Let's create an instance of OPCUAServer
var server = new opcua.OPCUAServer({
	hostname:"0.0.0.0",
    port: 3003, // the port of the listening socket of the server
    resourcePath: "MyLittleServer", // this path will be added to the endpoint resource name
	buildInfo : {
		productName: "MySampleServer1",
		buildNumber: "7658",
		buildDate: new Date(2014,5,2)
	}
});

function post_initialize() {
    console.log("initialized");
    function construct_my_address_space(server) {
		
        // Create the device 
        var addressSpace = server.engine.addressSpace;
        var device = addressSpace.addObject({
            organizedBy: addressSpace.rootFolder.objects,
            browseName: "TankController"
        });
		// Add the variable
        addressSpace.addVariable({
            componentOf: device,
            nodeId: "ns=1;s=water_level", // a string nodeID
            browseName: "Level",
            dataType: "Double",    
            value: {
                get: function () {return new opcua.Variant({dataType: opcua.DataType.Double, value: tank1.getLevel()});}
            }
        });
		addressSpace.addVariable({
            componentOf: device,
            nodeId: "ns=1;s=valv", // a string nodeID
            browseName: "Valve",
            dataType: "Double",    
            value: {
                get: function () {return new opcua.Variant({dataType: opcua.DataType.Double, value: tank1.getValve()});}
            }
        });
		// add methods
		var method1 = addressSpace.addMethod(device,{
			browseName: "setValve",
			inputArguments:  [
				{
					name:"valve",
					description: { text: "% of opening of the valve" },
					dataType: opcua.DataType.Float        
				}
			 ],
		});
		method1.bindMethod(function(inputArguments,context,callback) {
			var valveValue = inputArguments[0].value;
			tank1.setValve(valveValue);
			return callback(null,null);
		});
		var method2 = addressSpace.addMethod(device,{
			browseName: "startExperiment",
		});
		method2.bindMethod(function(inputArguments,context,callback) {
			tank1.startExperiment();
			return callback(null,null);
		});
		var method3 = addressSpace.addMethod(device,{
			browseName: "getValve",
			outputArguments: [{
				name: "valve",
				description: {text: "the ratio of the opening of the valve[%]"},
				dataType: opcua.DataType.Float,
				valueRank: 1
			}]
		});
		method3.bindMethod(function(inputArguments,context,callback) {
			var callMethodResult = {
				statusCode: opcua.StatusCodes.Good,
				outputArguments: [{
					dataType: opcua.DataType.Float,
					arrayType: opcua.VariantArrayType.Scalar,
					value: tank1.getValve()
				}]
			};
			callback(null, callMethodResult);
		});
		var method4 = addressSpace.addMethod(device,{
			browseName: "getLevel",
			outputArguments: [{
				name: "level",
				description: {text: "the ratio of the of the height of the lequid in the tank[%]"},
				dataType: opcua.DataType.Float,
				valueRank: 1
			}]
		});
		method4.bindMethod(function(inputArguments,context,callback) {
			var callMethodResult = {
				statusCode: opcua.StatusCodes.Good,
				outputArguments: [{
					dataType: opcua.DataType.Float,
					arrayType: opcua.VariantArrayType.Scalar,
					value: tank1.getLevel()
				}]
			};
			callback(null, callMethodResult);
		});
		// add historical data
		var levelRecord = addressSpace.addAnalogDataItem({
			browseName: "levelRecord",
			engineeringUnitsRange: {
				low:  0,
				high: 10.0
			},
			engineeringUnits: opcua.standardUnits.bar,
			componentOf: device
		});
		var valveRecord = addressSpace.addAnalogDataItem({
			browseName: "valveRecord",
			engineeringUnitsRange: {
				low:  0,
				high: 1.0
			},
			engineeringUnits: opcua.standardUnits.bar,
			componentOf: device
		});
		addressSpace.installHistoricalDataNode(levelRecord);
		addressSpace.installHistoricalDataNode(valveRecord);
		setInterval(function() {
			levelRecord.setValueFromSource({dataType:"Double",value:tank1.getLevel()});
			valveRecord.setValueFromSource({dataType:"Double",value:tank1.getValve()});
		}, 100);
    }
    construct_my_address_space(server);
    server.start(function() {
        console.log("Server is now listening ... ( press CTRL+C to stop)");
        console.log("port ", server.endpoints[0].port);
        console.log(server.endpoints.length);
		
        var endpointUrl = server.endpoints[0].endpointDescriptions()[0].endpointUrl;
        console.log(" the primary server endpoint url is ", endpointUrl );
    });
}
server.initialize(post_initialize);