// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src-celo/CeloAgentPayment.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract CeloAgentPaymentTest is Test {
    CeloAgentPayment public payment;
    MockUSDC public usdc;

    address public owner = address(this);
    address public agent1 = address(0x1);
    address public agent2 = address(0x2);

    function setUp() public {
        usdc = new MockUSDC();
        payment = new CeloAgentPayment(address(usdc));
        usdc.mint(agent1, 100_000_000);
        usdc.mint(agent2, 100_000_000);
    }

    function test_pay_basic() public {
        bytes32 nonce = keccak256("nonce1");
        uint256 amount = 2_000_000;

        vm.startPrank(agent1);
        usdc.approve(address(payment), amount);
        payment.pay(nonce, "email", amount);
        vm.stopPrank();

        assertTrue(payment.isNonceUsed(nonce));
        assertEq(payment.totalReceived(), amount);
        assertEq(usdc.balanceOf(address(payment)), amount);
        assertEq(usdc.balanceOf(agent1), 98_000_000);
    }

    function test_pay_emits_event() public {
        bytes32 nonce = keccak256("nonce2");
        uint256 amount = 500_000;

        vm.startPrank(agent1);
        usdc.approve(address(payment), amount);
        vm.expectEmit(true, false, true, true);
        emit CeloAgentPayment.PaymentReceived(agent1, amount, nonce, "identity", block.timestamp);
        payment.pay(nonce, "identity", amount);
        vm.stopPrank();
    }

    function test_pay_revert_nonce_reuse() public {
        bytes32 nonce = keccak256("nonce3");
        uint256 amount = 1_000_000;

        vm.startPrank(agent1);
        usdc.approve(address(payment), amount * 2);
        payment.pay(nonce, "email", amount);
        vm.expectRevert("Nonce already used");
        payment.pay(nonce, "email", amount);
        vm.stopPrank();
    }

    function test_pay_revert_zero_amount() public {
        bytes32 nonce = keccak256("nonce4");
        vm.prank(agent1);
        vm.expectRevert("Zero amount");
        payment.pay(nonce, "email", 0);
    }

    function test_pay_revert_no_approval() public {
        bytes32 nonce = keccak256("nonce5");
        vm.prank(agent1);
        vm.expectRevert();
        payment.pay(nonce, "email", 1_000_000);
    }

    function test_pay_multiple_agents() public {
        bytes32 nonce1 = keccak256("a1");
        bytes32 nonce2 = keccak256("a2");

        vm.startPrank(agent1);
        usdc.approve(address(payment), 3_000_000);
        payment.pay(nonce1, "phone", 3_000_000);
        vm.stopPrank();

        vm.startPrank(agent2);
        usdc.approve(address(payment), 2_000_000);
        payment.pay(nonce2, "email", 2_000_000);
        vm.stopPrank();

        assertEq(payment.totalReceived(), 5_000_000);
        assertEq(usdc.balanceOf(address(payment)), 5_000_000);
    }

    function test_withdraw() public {
        bytes32 nonce = keccak256("w1");
        vm.startPrank(agent1);
        usdc.approve(address(payment), 5_000_000);
        payment.pay(nonce, "phone", 5_000_000);
        vm.stopPrank();

        address recipient = address(0x99);
        payment.withdraw(recipient, 3_000_000);
        assertEq(usdc.balanceOf(recipient), 3_000_000);
        assertEq(usdc.balanceOf(address(payment)), 2_000_000);
    }

    function test_withdraw_revert_not_owner() public {
        vm.prank(agent1);
        vm.expectRevert("Not owner");
        payment.withdraw(agent1, 1);
    }

    function test_withdraw_revert_zero_address() public {
        vm.expectRevert("Invalid address");
        payment.withdraw(address(0), 1);
    }

    function test_withdraw_revert_insufficient() public {
        vm.expectRevert("Insufficient balance");
        payment.withdraw(address(0x99), 1);
    }

    function test_constructor_sets_owner() public view {
        assertEq(payment.owner(), owner);
    }

    function test_constructor_sets_token() public view {
        assertEq(address(payment.token()), address(usdc));
    }

    function test_constructor_revert_zero_token() public {
        vm.expectRevert("Invalid token");
        new CeloAgentPayment(address(0));
    }

    function testFuzz_pay_any_amount(uint256 amount) public {
        amount = bound(amount, 1, 50_000_000);
        bytes32 nonce = keccak256(abi.encode(amount));

        vm.startPrank(agent1);
        usdc.approve(address(payment), amount);
        payment.pay(nonce, "test", amount);
        vm.stopPrank();

        assertTrue(payment.isNonceUsed(nonce));
        assertEq(payment.totalReceived(), amount);
    }

    // ─────────────────────────────────────────────────
    // New tests (added to expand coverage)
    // ─────────────────────────────────────────────────

    function test_pay_exact_approval() public {
        bytes32 nonce = keccak256("exact");
        uint256 amount = 1_000_000;

        vm.startPrank(agent1);
        usdc.approve(address(payment), amount);
        payment.pay(nonce, "email", amount);
        vm.stopPrank();

        // Allowance must be fully consumed
        assertEq(usdc.allowance(agent1, address(payment)), 0);
        assertTrue(payment.isNonceUsed(nonce));
    }

    function test_pay_insufficient_balance() public {
        // agent3 has no USDC but approves anyway
        address agent3 = address(0x3);
        bytes32 nonce = keccak256("broke");
        uint256 amount = 1_000_000;

        vm.startPrank(agent3);
        usdc.approve(address(payment), amount);
        vm.expectRevert();
        payment.pay(nonce, "email", amount);
        vm.stopPrank();
    }

    function test_pay_partial_approval() public {
        bytes32 nonce = keccak256("partial");
        uint256 amount = 5_000_000;

        vm.startPrank(agent1);
        usdc.approve(address(payment), amount - 1); // one unit short
        vm.expectRevert();
        payment.pay(nonce, "email", amount);
        vm.stopPrank();
    }

    function test_pay_different_resource_types() public {
        string[5] memory types = ["identity", "email", "phone", "sms", "compute"];
        uint256 amount = 1_000_000;

        for (uint256 i = 0; i < types.length; i++) {
            bytes32 nonce = keccak256(abi.encode("res", i));
            vm.startPrank(agent1);
            usdc.approve(address(payment), amount);
            payment.pay(nonce, types[i], amount);
            vm.stopPrank();
            assertTrue(payment.isNonceUsed(nonce));
        }

        assertEq(payment.totalReceived(), amount * types.length);
    }

    function test_pay_same_nonce_different_agents() public {
        bytes32 nonce = keccak256("shared-nonce");
        uint256 amount = 1_000_000;

        // agent1 uses the nonce first — should succeed
        vm.startPrank(agent1);
        usdc.approve(address(payment), amount);
        payment.pay(nonce, "email", amount);
        vm.stopPrank();

        // agent2 tries the same nonce — must revert (nonce is global)
        vm.startPrank(agent2);
        usdc.approve(address(payment), amount);
        vm.expectRevert("Nonce already used");
        payment.pay(nonce, "email", amount);
        vm.stopPrank();
    }

    function test_withdraw_full_balance() public {
        bytes32 nonce = keccak256("full");
        uint256 amount = 7_000_000;

        vm.startPrank(agent1);
        usdc.approve(address(payment), amount);
        payment.pay(nonce, "phone", amount);
        vm.stopPrank();

        address recipient = address(0xAA);
        payment.withdraw(recipient, amount);

        assertEq(usdc.balanceOf(address(payment)), 0);
        assertEq(usdc.balanceOf(recipient), amount);
    }

    function test_withdraw_emits_event() public {
        bytes32 nonce = keccak256("ev");
        uint256 amount = 3_000_000;

        vm.startPrank(agent1);
        usdc.approve(address(payment), amount);
        payment.pay(nonce, "email", amount);
        vm.stopPrank();

        address recipient = address(0xBB);
        vm.expectEmit(true, false, false, true);
        emit CeloAgentPayment.Withdrawn(recipient, amount);
        payment.withdraw(recipient, amount);
    }

    function test_withdraw_multiple_times() public {
        bytes32 nonce = keccak256("multi-w");
        uint256 deposited = 9_000_000;

        vm.startPrank(agent1);
        usdc.approve(address(payment), deposited);
        payment.pay(nonce, "compute", deposited);
        vm.stopPrank();

        address recipient = address(0xCC);
        payment.withdraw(recipient, 3_000_000);
        payment.withdraw(recipient, 3_000_000);
        payment.withdraw(recipient, 3_000_000);

        assertEq(usdc.balanceOf(address(payment)), 0);
        assertEq(usdc.balanceOf(recipient), deposited);
    }

    function test_pay_after_withdraw() public {
        uint256 amount = 4_000_000;

        // First pay
        bytes32 nonce1 = keccak256("paw1");
        vm.startPrank(agent1);
        usdc.approve(address(payment), amount);
        payment.pay(nonce1, "email", amount);
        vm.stopPrank();

        // Withdraw everything
        payment.withdraw(address(0xDD), amount);
        assertEq(usdc.balanceOf(address(payment)), 0);

        // Second pay — contract must still accept payments
        bytes32 nonce2 = keccak256("paw2");
        vm.startPrank(agent2);
        usdc.approve(address(payment), amount);
        payment.pay(nonce2, "email", amount);
        vm.stopPrank();

        assertEq(usdc.balanceOf(address(payment)), amount);
        assertTrue(payment.isNonceUsed(nonce2));
    }

    function test_total_received_accumulates() public {
        address[5] memory agents;
        for (uint256 i = 0; i < 5; i++) {
            agents[i] = address(uint160(0x100 + i));
            usdc.mint(agents[i], 10_000_000);
        }

        uint256 unitAmount = 1_000_000;
        uint256 expectedTotal = 0;

        for (uint256 i = 0; i < 5; i++) {
            bytes32 nonce = keccak256(abi.encode("acc", i));
            vm.startPrank(agents[i]);
            usdc.approve(address(payment), unitAmount);
            payment.pay(nonce, "identity", unitAmount);
            vm.stopPrank();
            expectedTotal += unitAmount;
        }

        assertEq(payment.totalReceived(), expectedTotal);
    }

    function testFuzz_nonce_uniqueness(bytes32 nonce) public {
        uint256 amount = 1_000_000;

        // First use always succeeds
        vm.startPrank(agent1);
        usdc.approve(address(payment), amount);
        payment.pay(nonce, "test", amount);
        vm.stopPrank();

        assertTrue(payment.isNonceUsed(nonce));

        // Second use always reverts
        vm.startPrank(agent2);
        usdc.approve(address(payment), amount);
        vm.expectRevert("Nonce already used");
        payment.pay(nonce, "test", amount);
        vm.stopPrank();
    }

    function testFuzz_withdraw_any_amount(uint256 withdrawAmount) public {
        uint256 deposited = 50_000_000;
        withdrawAmount = bound(withdrawAmount, 1, deposited);

        bytes32 nonce = keccak256(abi.encode("fuzz-w", withdrawAmount));

        vm.startPrank(agent1);
        usdc.approve(address(payment), deposited);
        payment.pay(nonce, "test", deposited);
        vm.stopPrank();

        address recipient = address(0xEE);
        payment.withdraw(recipient, withdrawAmount);

        assertEq(usdc.balanceOf(recipient), withdrawAmount);
        assertEq(usdc.balanceOf(address(payment)), deposited - withdrawAmount);
    }

    function test_pay_max_uint256_nonce() public {
        bytes32 nonce = bytes32(type(uint256).max);
        uint256 amount = 1_000_000;

        vm.startPrank(agent1);
        usdc.approve(address(payment), amount);
        payment.pay(nonce, "email", amount);
        vm.stopPrank();

        assertTrue(payment.isNonceUsed(nonce));
    }

    function test_pay_empty_resource_type() public {
        bytes32 nonce = keccak256("empty-res");
        uint256 amount = 1_000_000;

        vm.startPrank(agent1);
        usdc.approve(address(payment), amount);
        // Empty string should be accepted — no validation on resourceType
        payment.pay(nonce, "", amount);
        vm.stopPrank();

        assertTrue(payment.isNonceUsed(nonce));
        assertEq(payment.totalReceived(), amount);
    }

    function test_owner_cannot_be_changed() public {
        // The contract has no ownership-transfer function.
        // Verify that owner stays constant after deployment.
        address originalOwner = payment.owner();
        assertEq(originalOwner, owner);

        // Attempting to call a non-existent transferOwnership should revert at the ABI level.
        // We verify the invariant by checking the selector is absent and owner unchanged.
        bytes4 transferSig = bytes4(keccak256("transferOwnership(address)"));
        (bool success, ) = address(payment).call(abi.encodeWithSelector(transferSig, agent1));
        assertFalse(success, "transferOwnership should not exist");

        // Owner is still the original deployer
        assertEq(payment.owner(), originalOwner);
    }
}
