const response = require("cfn-response"),
    AWS = require("aws-sdk"),
    GroupName = "Allow-Cloudfront",
    tryToAllowIps = function (e, n, r, o, s) {
        return "undefined" == typeof r[o] ? s(null, {}) : void e.authorizeSecurityGroupIngress({
            GroupId: n,
            IpPermissions: [{IpProtocol: "TCP", FromPort: "80", ToPort: "80", IpRanges: [{CidrIp: r[o]}]}]
        }, function (i, u) {
            tryToAllowIps(e, n, r, o + 1, s)
        })
    },
    allowIps = function (e, n, r) {
        var o = require("https"),
            s = o.request({
                hostname: "ip-ranges.amazonaws.com",
                port: 443,
                path: "/ip-ranges.json",
                method: "GET"
            }, function (e) {
            });
        s.on("response", function (o) {
            var s = "";
            o.on("data", function (e) {
                s += e
            }), o.on("end", function () {
                for (var o = JSON.parse(s), i = [], u = 0; u < o.prefixes.length; u++) "CLOUDFRONT" === o.prefixes[u].service && i.push(o.prefixes[u].ip_prefix);
                tryToAllowIps(e, n, i, 0, function (e, n) {
                    return r(null, {})
                })
            })
        }), s.end()
    },
    finish = {
        send: function (e, n, r, o, s) {
            return "undefined" != typeof e.RequestType ? response.send(e, n, r, o, s) : n.done()
        }
    };
exports.handler = function(e, n) {
    const r = new AWS.SNS;
    r.subscribe({ Protocol: "lambda", TopicArn: "arn:aws:sns:us-east-1:806199016981:AmazonIpSpaceChanged", Endpoint: n.invokedFunctionArn },
        function(r, o) {
        console.log(r);
        console.log(o);
        AWS.config.update({ region: "us-east-1" }); var s = "vpc-0d91de6b5a037c20f",
            i = new AWS.EC2;
        i.describeSecurityGroups({ Filters: [{ Name: "group-name", Values: [GroupName] }] },
            function(r, o) { 0 === o.SecurityGroups.length ? i.createSecurityGroup({ Description: "Allow IPs from Cloudfront Edge Locations", GroupName: GroupName, VpcId: s }, function(r, o) { return null !== r ? finish.send(e, n, response.FAILED, r) : void allowIps(i, o.GroupId, function(r, o) { return null !== r ? finish.send(e, n, response.FAILED, r) : finish.send(e, n, response.SUCCESS) }) }) : allowIps(i, o.SecurityGroups[0].GroupId, function(r, o) { return null !== r ? finish.send(e, n, response.FAILED, r) : finish.send(e, n, response.SUCCESS) }) }) }) };
