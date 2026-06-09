// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/OnChainPoll.sol";

contract OnChainPollTest is Test {

    OnChainPoll poll;

    address alice = makeAddr("alice");
    address bob   = makeAddr("bob");
    address carol = makeAddr("carol");

    string[] twoOptions;
    string[] threeOptions;

    function setUp() public {
        poll = new OnChainPoll();

        twoOptions.push("Yes");
        twoOptions.push("No");

        threeOptions.push("Pizza");
        threeOptions.push("Sushi");
        threeOptions.push("Tacos");
    }

    // ─── createPoll ───────────────────────────────────────────────────

    function test_CreatePoll_StoresDataCorrectly() public {
        vm.prank(alice);
        uint256 id = poll.createPoll("Best food?", threeOptions, 1 days);

        (string memory q, uint256 dl, address creator, bool exists) = poll.polls(id);
        assertEq(q, "Best food?");
        assertEq(creator, alice);
        assertEq(dl, block.timestamp + 1 days);
        assertTrue(exists);
        assertEq(id, 0);
        assertEq(poll.nextPollId(), 1);
    }

    function test_CreatePoll_EmitsEvent() public {
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit OnChainPoll.PollCreated(0, alice, "Best food?", block.timestamp + 1 days);
        poll.createPoll("Best food?", threeOptions, 1 days);
    }

    function test_CreatePoll_Reverts_LessThan2Options() public {
        string[] memory one = new string[](1);
        one[0] = "Solo";
        vm.expectRevert("Need at least 2 options");
        poll.createPoll("Q?", one, 1 days);
    }

    function test_CreatePoll_Reverts_MoreThan10Options() public {
        string[] memory eleven = new string[](11);
        for (uint i = 0; i < 11; i++) eleven[i] = "x";
        vm.expectRevert("Max 10 options");
        poll.createPoll("Q?", eleven, 1 days);
    }

    function test_CreatePoll_Reverts_ZeroDuration() public {
        vm.expectRevert("Duration must be positive");
        poll.createPoll("Q?", twoOptions, 0);
    }

    // ─── vote ─────────────────────────────────────────────────────────

    function test_Vote_CountsCorrectly() public {
        poll.createPoll("Q?", twoOptions, 1 days);

        vm.prank(alice);
        poll.vote(0, 0); // votes "Yes"
        vm.prank(bob);
        poll.vote(0, 0); // votes "Yes"
        vm.prank(carol);
        poll.vote(0, 1); // votes "No"

        uint256[] memory results = poll.getResults(0);
        assertEq(results[0], 2); // Yes: 2
        assertEq(results[1], 1); // No:  1
    }

    function test_Vote_EmitsEvent() public {
        poll.createPoll("Q?", twoOptions, 1 days);
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit OnChainPoll.Voted(0, alice, 1);
        poll.vote(0, 1);
    }

    function test_Vote_Reverts_DoubleVote() public {
        poll.createPoll("Q?", twoOptions, 1 days);
        vm.prank(alice);
        poll.vote(0, 0);
        vm.prank(alice);
        vm.expectRevert("Already voted");
        poll.vote(0, 0);
    }

    function test_Vote_Reverts_AfterDeadline() public {
        poll.createPoll("Q?", twoOptions, 1 hours);
        vm.warp(block.timestamp + 2 hours); // viajamos en el tiempo
        vm.prank(alice);
        vm.expectRevert("Poll has ended");
        poll.vote(0, 0);
    }

    function test_Vote_Reverts_InvalidOption() public {
        poll.createPoll("Q?", twoOptions, 1 days); // opciones: 0 y 1
        vm.prank(alice);
        vm.expectRevert("Invalid option");
        poll.vote(0, 99);
    }

    function test_Vote_Reverts_PollNotExist() public {
        vm.prank(alice);
        vm.expectRevert("Poll does not exist");
        poll.vote(999, 0);
    }

    // ─── isActive ─────────────────────────────────────────────────────

    function test_IsActive_TrueBeforeDeadline() public {
        poll.createPoll("Q?", twoOptions, 1 days);
        assertTrue(poll.isActive(0));
    }

    function test_IsActive_FalseAfterDeadline() public {
        poll.createPoll("Q?", twoOptions, 1 hours);
        vm.warp(block.timestamp + 2 hours);
        assertFalse(poll.isActive(0));
    }

    // ─── multiple polls ───────────────────────────────────────────────

    function test_MultiplePollsAreIndependent() public {
        poll.createPoll("Poll A?", twoOptions, 1 days);
        poll.createPoll("Poll B?", threeOptions, 2 days);

        vm.prank(alice);
        poll.vote(0, 1); // vota en poll A
        vm.prank(alice);
        poll.vote(1, 2); // alice puede votar en poll B también (diferente poll)

        uint256[] memory a = poll.getResults(0);
        uint256[] memory b = poll.getResults(1);
        assertEq(a[1], 1);
        assertEq(b[2], 1);
    }
}
