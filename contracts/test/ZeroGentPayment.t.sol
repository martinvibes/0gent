// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/ZeroGentPayment.sol";

contract ZeroGentPaymentTest is Test {
    ZeroGentPayment public payment;
    address public deployer;
    address public agent = makeAddr("agent");
    address public agent2 = makeAddr("agent2");
    address public treasury = makeAddr("treasury");

    function setUp() public {
        deployer = address(this);
        payment = new ZeroGentPayment();
        vm.deal(agent, 100 ether);
        vm.deal(agent2, 100 ether);
    }

    // ─── Constructor ───

    function test_constructor_sets_owner() public view {
        assertEq(payment.owner(), deployer);
    }

    function test_initial_total_received_is_zero() public view {
        assertEq(payment.totalReceived(), 0);
    }

    // ─── pay() ───

    function test_pay_emits_event() public {
        bytes32 nonce = keccak256("nonce-1");
        vm.prank(agent);
        vm.expectEmit(true, true, false, true);
        emit ZeroGentPayment.PaymentReceived(agent, 1 ether, nonce, "phone", block.timestamp);
        payment.pay{value: 1 ether}(nonce, "phone");
    }

    function test_pay_updates_total_received() public {
        bytes32 nonce = keccak256("nonce-2");
        vm.prank(agent);
        payment.pay{value: 2 ether}(nonce, "email");
        assertEq(payment.totalReceived(), 2 ether);
    }

    function test_pay_accumulates_multiple_payments() public {
        vm.prank(agent);
        payment.pay{value: 1 ether}(keccak256("a"), "phone");
        vm.prank(agent);
        payment.pay{value: 3 ether}(keccak256("b"), "email");
        vm.prank(agent2);
        payment.pay{value: 0.5 ether}(keccak256("c"), "compute");
        assertEq(payment.totalReceived(), 4.5 ether);
        assertEq(address(payment).balance, 4.5 ether);
    }

    function test_pay_rejects_zero_value() public {
        vm.prank(agent);
        vm.expectRevert("ZGP: zero payment");
        payment.pay{value: 0}(keccak256("nonce"), "phone");
    }

    function test_pay_rejects_replay_same_sender() public {
        bytes32 nonce = keccak256("replay");
        vm.prank(agent);
        payment.pay{value: 1 ether}(nonce, "phone");
        vm.prank(agent);
        vm.expectRevert("ZGP: nonce already used");
        payment.pay{value: 1 ether}(nonce, "phone");
    }

    function test_pay_rejects_replay_different_sender() public {
        bytes32 nonce = keccak256("cross-replay");
        vm.prank(agent);
        payment.pay{value: 1 ether}(nonce, "phone");
        vm.prank(agent2);
        vm.expectRevert("ZGP: nonce already used");
        payment.pay{value: 1 ether}(nonce, "email");
    }

    function test_pay_works_with_different_nonces_same_resource() public {
        vm.prank(agent);
        payment.pay{value: 1 ether}(keccak256("n1"), "phone");
        vm.prank(agent);
        payment.pay{value: 1 ether}(keccak256("n2"), "phone");
        assertEq(payment.totalReceived(), 2 ether);
    }

    function test_pay_works_with_small_amounts() public {
        vm.prank(agent);
        payment.pay{value: 1 wei}(keccak256("tiny"), "phone");
        assertEq(payment.totalReceived(), 1 wei);
    }

    function test_pay_works_with_large_amounts() public {
        vm.deal(agent, 10000 ether);
        vm.prank(agent);
        payment.pay{value: 9999 ether}(keccak256("huge"), "compute");
        assertEq(payment.totalReceived(), 9999 ether);
    }

    function test_pay_with_empty_resource_type() public {
        vm.prank(agent);
        payment.pay{value: 1 ether}(keccak256("empty-type"), "");
        assertEq(payment.totalReceived(), 1 ether);
    }

    function test_pay_with_long_resource_type() public {
        vm.prank(agent);
        payment.pay{value: 1 ether}(keccak256("long-type"), "this-is-a-very-long-resource-type-string-that-tests-calldata");
        assertEq(payment.totalReceived(), 1 ether);
    }

    function test_pay_contract_balance_matches() public {
        vm.prank(agent);
        payment.pay{value: 5 ether}(keccak256("balance-check"), "phone");
        assertEq(address(payment).balance, 5 ether);
    }

    // ─── isNonceUsed() ───

    function test_nonce_initially_unused() public view {
        assertFalse(payment.isNonceUsed(keccak256("fresh")));
    }

    function test_nonce_marked_used_after_payment() public {
        bytes32 nonce = keccak256("mark-used");
        assertFalse(payment.isNonceUsed(nonce));
        vm.prank(agent);
        payment.pay{value: 1 ether}(nonce, "compute");
        assertTrue(payment.isNonceUsed(nonce));
    }

    function test_zero_nonce_works() public {
        bytes32 zeroNonce = bytes32(0);
        assertFalse(payment.isNonceUsed(zeroNonce));
        vm.prank(agent);
        payment.pay{value: 1 ether}(zeroNonce, "phone");
        assertTrue(payment.isNonceUsed(zeroNonce));
    }

    function test_max_nonce_works() public {
        bytes32 maxNonce = bytes32(type(uint256).max);
        vm.prank(agent);
        payment.pay{value: 1 ether}(maxNonce, "phone");
        assertTrue(payment.isNonceUsed(maxNonce));
    }

    // ─── withdraw() ───

    function test_withdraw_full_balance() public {
        vm.prank(agent);
        payment.pay{value: 5 ether}(keccak256("w1"), "domain");

        uint256 before = treasury.balance;
        payment.withdraw(payable(treasury), 5 ether);
        assertEq(treasury.balance, before + 5 ether);
        assertEq(address(payment).balance, 0);
    }

    function test_withdraw_partial_balance() public {
        vm.prank(agent);
        payment.pay{value: 5 ether}(keccak256("w2"), "domain");

        payment.withdraw(payable(treasury), 3 ether);
        assertEq(address(payment).balance, 2 ether);
    }

    function test_withdraw_emits_event() public {
        vm.prank(agent);
        payment.pay{value: 5 ether}(keccak256("w3"), "domain");

        vm.expectEmit(true, false, false, true);
        emit ZeroGentPayment.Withdrawn(treasury, 2 ether);
        payment.withdraw(payable(treasury), 2 ether);
    }

    function test_withdraw_multiple_times() public {
        vm.prank(agent);
        payment.pay{value: 10 ether}(keccak256("w4"), "phone");

        payment.withdraw(payable(treasury), 3 ether);
        payment.withdraw(payable(treasury), 4 ether);
        assertEq(address(payment).balance, 3 ether);
        assertEq(treasury.balance, 7 ether);
    }

    function test_withdraw_rejects_non_owner() public {
        vm.prank(agent);
        payment.pay{value: 1 ether}(keccak256("w5"), "phone");

        vm.prank(agent);
        vm.expectRevert("ZGP: not owner");
        payment.withdraw(payable(agent), 1 ether);
    }

    function test_withdraw_rejects_insufficient_balance() public {
        vm.expectRevert("ZGP: insufficient balance");
        payment.withdraw(payable(treasury), 1 ether);
    }

    function test_withdraw_rejects_more_than_balance() public {
        vm.prank(agent);
        payment.pay{value: 1 ether}(keccak256("w6"), "phone");

        vm.expectRevert("ZGP: insufficient balance");
        payment.withdraw(payable(treasury), 2 ether);
    }

    function test_withdraw_zero_amount_succeeds() public {
        payment.withdraw(payable(treasury), 0);
        assertEq(treasury.balance, 0);
    }

    function test_withdraw_to_different_addresses() public {
        address payable addr1 = payable(makeAddr("addr1"));
        address payable addr2 = payable(makeAddr("addr2"));

        vm.prank(agent);
        payment.pay{value: 6 ether}(keccak256("w7"), "phone");

        payment.withdraw(addr1, 2 ether);
        payment.withdraw(addr2, 3 ether);
        assertEq(addr1.balance, 2 ether);
        assertEq(addr2.balance, 3 ether);
        assertEq(address(payment).balance, 1 ether);
    }

    // ─── receive() ───

    function test_receive_accepts_direct_transfer() public {
        vm.prank(agent);
        (bool ok,) = address(payment).call{value: 2 ether}("");
        assertTrue(ok);
        assertEq(payment.totalReceived(), 2 ether);
        assertEq(address(payment).balance, 2 ether);
    }

    function test_receive_accumulates_with_pay() public {
        vm.prank(agent);
        payment.pay{value: 3 ether}(keccak256("r1"), "phone");
        vm.prank(agent);
        (bool ok,) = address(payment).call{value: 1 ether}("");
        assertTrue(ok);
        assertEq(payment.totalReceived(), 4 ether);
    }

    // ─── Fuzz tests ───

    function testFuzz_pay_any_amount(uint128 amount) public {
        vm.assume(amount > 0);
        vm.deal(agent, uint256(amount));
        bytes32 nonce = keccak256(abi.encodePacked("fuzz", amount));

        vm.prank(agent);
        payment.pay{value: amount}(nonce, "fuzz");
        assertEq(payment.totalReceived(), amount);
        assertTrue(payment.isNonceUsed(nonce));
    }

    function testFuzz_unique_nonces(bytes32 nonce1, bytes32 nonce2) public {
        vm.assume(nonce1 != nonce2);
        vm.prank(agent);
        payment.pay{value: 1 ether}(nonce1, "a");
        vm.prank(agent);
        payment.pay{value: 1 ether}(nonce2, "b");
        assertTrue(payment.isNonceUsed(nonce1));
        assertTrue(payment.isNonceUsed(nonce2));
        assertEq(payment.totalReceived(), 2 ether);
    }

    function testFuzz_withdraw_up_to_balance(uint128 deposit, uint128 withdrawAmount) public {
        vm.assume(deposit > 0);
        vm.assume(withdrawAmount <= deposit);
        vm.deal(agent, uint256(deposit));

        vm.prank(agent);
        payment.pay{value: deposit}(keccak256(abi.encodePacked("fuzz-w", deposit)), "phone");

        payment.withdraw(payable(treasury), withdrawAmount);
        assertEq(address(payment).balance, uint256(deposit) - uint256(withdrawAmount));
    }
}
