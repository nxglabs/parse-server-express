/*
--version: 1.0
--created by :pooja navkar
--last Mddified date:18/11/2019
--Description :cloud function called to add mater key to query 
  and let get data */

//-- Export Modules
var request1 = require("request").defaults({ rejectUnauthorized: false });
//const dotenv = require("dotenv");
//dotenv.config();
var Parse = require("parse/node").Parse;
Parse.initialize(process.env.APP_ID, process.env.MASTER_KEY);

exports.getdistinctFunction = async function uniqueQuery(request) {
  try {
    var condition = request.params.condition;
    var className = request.params.className;
    //console.log("className " + className);
    
    if (condition == undefined) {
      return Promise.reject("Error:condition not found!");
    }
    if (className == undefined) {
      return Promise.reject("Error:className not found!");
    }
    var appName;
    if (className) {
      appName = className.split("_")[0];
      appName = appName + "_";
    }
    //console.log("appId " + appId);
    var response = {};
    var rolelist = {};
    var clplist = {};

    //--function to get the userid from session token
    function getuserid(request) {
      return new Promise(function (resolve, reject) {
        const options = {
          url: process.env.SERVER_URL + "/users/me",
          method: "get",
          headers: {
            "X-Parse-Application-Id": process.env.APP_ID,
            "X-Parse-Session-Token": request.headers["sessiontoken"]
          },
          json: true
        };

        request1(options, function (err, res, body) {
          if (err) {
            console.error(err);
            return;
          }
          var error = body == "" ? true : false;
          if (error) {
            reject("result not found!");
          } else {
            resolve(body);
          }
        });
      });
    }
    var userData = await getuserid(request);
    var userid = userData.objectId;
    var url =
      process.env.SERVER_URL +
      '/roles?where={"users":{"__type":"Pointer","className":"_User","objectId":"' +
      userid +
      '"},"name": {"$regex": "' + appName + '"}}';

    //-- check user role
    function getRoleList(userid) {
      return new Promise(function (resolve, reject) {
        const options = {
          url: url,
          method: "get",
          headers: {
            "X-Parse-Application-Id": process.env.APP_ID
          },
          json: true
        };

        request1(options, function (err, res, body) {
          if (err) {
            console.error(err);
            return;
          }
          var roleres = [];
          for (var i = 0; i < body["results"].length; i++) {
            var rolename = body["results"][i]["name"];
            //var roleprefix = rolename.split("_")[0];
            roleres.push(rolename);
          }
          var error = roleres == "" ? true : false;
          if (error) {
            reject("result not found!");
          } else {
            resolve(roleres);
          }
        });
      });
    }
    rolelist = await getRoleList(request);
    //console.log("rolelist");

    //-- check user clp of class
    function getclp(request) {
      var clpurl = process.env.SERVER_URL + "/schemas/" + className;
      return new Promise(function (resolve, reject) {
        const options = {
          url: clpurl,
          method: "get",
          headers: {
            "X-Parse-Application-Id": process.env.APP_ID,
            "X-Parse-Master-Key": process.env.MASTER_KEY
          },
          json: true
        };

        request1(options, function (err, res, body) {
          if (err) {
            console.error(err);
            return;
          }

          var clpres = [];
          clpres.push(body["classLevelPermissions"]["get"]);
          //console.log(clpres);

          var error = clpres == "" ? true : false;
          if (error) {
            reject("result not found!");
          } else {
            resolve(clpres);
          }
        });
      });
    }
    clplist = await getclp(request);
    //console.log("clplist");
    //console.log(clplist);

    //--check user authentication to get unique query result
    var chkrole;
    if (clplist) {
      var str = JSON.stringify(clplist);
    }
    for (i = 0; i < rolelist.length; i++) {
      var result = str.includes(rolelist[i]);
      if (result == true) {
        chkrole = result;
      }
      //console.log("chkrole " + chkrole);
    }
    var usersdded = str.includes(userid);
    //console.log("usersdded " + usersdded);
    //console.log(str);
    //console.log(str.includes('[{"*":true}]'));
    if (str.includes('[{"*":true}]') == true) {
      response = await getdistinct(request);
      //console.log(response);
      process.stdin.resume();
      // listen to the event 
      process.on('SIGTERM', () => {
        process.emit('cleanup');
      })
      return response["results"];
    } else if (chkrole == true || usersdded == true) {
      response = await getdistinct(request);
      process.stdin.resume();
      // listen to the event 
      process.on('SIGTERM', () => {
        process.emit('cleanup');
      })
      return response["results"];
    } else {
      return Promise.reject("Error:unauthorized");
    }
    //--if user authorized let get the data
    function getdistinct(request) {
      //console.log(condition.includes("group"));
      if (condition.includes("group") == true) {
        condition = condition.replace(/'/g, '"');
        //console.log(condition);
      }
      var url1 =
        process.env.SERVER_URL + "/aggregate/" + className + "?" + condition;
      //console.log(url1);
      return new Promise(function (resolve, reject) {
        const options = {
          url: url1,
          method: "get",
          headers: {
            "X-Parse-Application-Id": process.env.APP_ID,
            "X-Parse-Master-Key": process.env.MASTER_KEY
          },
          json: true
        };

        request1(options, function (err, res, body) {
          if (err) {
            console.error(err);
            return;
          }
          //console.log(body);
          var error = body == "" ? true : false;
          if (error) {
            reject("result not found!");
          } else {
            resolve(body);
          }
        });
      });
    }
  } catch (err) {
    console.log("err in getdistinct");
    console.log(err);
    return Promise.reject("Error:Exeption in query");
  }
};
