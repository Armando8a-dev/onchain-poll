// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/OnChainPoll.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        OnChainPoll poll = new OnChainPoll();
        console.log("OnChainPoll deployed at:", address(poll));
        vm.stopBroadcast();
    }
}
