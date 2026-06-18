// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src-celo/CeloAgentPayment.sol";
import "../src-celo/CeloAgentRegistry.sol";

contract DeployCelo is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address usdcAddress = vm.envAddress("CELO_USDC_ADDRESS");

        vm.startBroadcast(deployerKey);

        CeloAgentPayment payment = new CeloAgentPayment(usdcAddress);
        CeloAgentRegistry registry = new CeloAgentRegistry();

        vm.stopBroadcast();

        console.log("CeloAgentPayment:", address(payment));
        console.log("CeloAgentRegistry:", address(registry));
        console.log("USDC token:", usdcAddress);
    }
}
