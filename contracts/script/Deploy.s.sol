// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/ZeroGentPayment.sol";
import "../src/AgentRegistry.sol";
import "../src/ZeroGentIdentity.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        ZeroGentPayment payment = new ZeroGentPayment();
        AgentRegistry registry = new AgentRegistry();
        ZeroGentIdentity identity = new ZeroGentIdentity();

        vm.stopBroadcast();

        console.log("ZeroGentPayment:", address(payment));
        console.log("AgentRegistry:  ", address(registry));
        console.log("ZeroGentIdentity:", address(identity));
    }
}
