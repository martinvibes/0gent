// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/ZeroGentIdentity.sol";

contract ZeroGentIdentityTest is Test {
    ZeroGentIdentity public identity;
    address public deployer;
    address public agent = makeAddr("agent");
    address public agent2 = makeAddr("agent2");
    address public agent3 = makeAddr("agent3");
    address public stranger = makeAddr("stranger");

    function setUp() public {
        deployer = address(this);
        identity = new ZeroGentIdentity();
    }

    // ─── Constructor ───

    function test_constructor_sets_admin() public view {
        assertEq(identity.admin(), deployer);
    }

    function test_name_and_symbol() public view {
        assertEq(identity.name(), "0GENT Identity");
        assertEq(identity.symbol(), "0GENT-ID");
    }

    // ─── mintIdentity() ───

    function test_mint_returns_token_id() public {
        uint256 tokenId = identity.mintIdentity(agent, "0g://abc123");
        assertEq(tokenId, 1);
    }

    function test_mint_assigns_ownership() public {
        uint256 tokenId = identity.mintIdentity(agent, "0g://abc123");
        assertEq(identity.ownerOf(tokenId), agent);
    }

    function test_mint_sets_agent_token_mapping() public {
        identity.mintIdentity(agent, "0g://abc123");
        assertEq(identity.agentTokenId(agent), 1);
    }

    function test_mint_has_identity_returns_true() public {
        assertFalse(identity.hasIdentity(agent));
        identity.mintIdentity(agent, "0g://abc123");
        assertTrue(identity.hasIdentity(agent));
    }

    function test_mint_sets_metadata_uri() public {
        uint256 tokenId = identity.mintIdentity(agent, "0g://metadata-hash");
        assertEq(identity.tokenURI(tokenId), "0g://metadata-hash");
    }

    function test_mint_emits_event() public {
        vm.expectEmit(true, true, false, true);
        emit ZeroGentIdentity.AgentIdentityMinted(agent, 1, "0g://test");
        identity.mintIdentity(agent, "0g://test");
    }

    function test_mint_increments_token_ids() public {
        uint256 id1 = identity.mintIdentity(agent, "0g://a");
        uint256 id2 = identity.mintIdentity(agent2, "0g://b");
        uint256 id3 = identity.mintIdentity(agent3, "0g://c");
        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(id3, 3);
    }

    function test_mint_one_per_agent_reverts() public {
        identity.mintIdentity(agent, "0g://first");
        vm.expectRevert("ZGI: already minted");
        identity.mintIdentity(agent, "0g://second");
    }

    function test_mint_zero_address_reverts() public {
        vm.expectRevert("ZGI: zero address");
        identity.mintIdentity(address(0), "0g://test");
    }

    function test_mint_only_admin() public {
        vm.prank(stranger);
        vm.expectRevert("ZGI: not admin");
        identity.mintIdentity(agent, "0g://test");
    }

    function test_mint_with_empty_metadata() public {
        uint256 tokenId = identity.mintIdentity(agent, "");
        assertEq(identity.tokenURI(tokenId), "");
    }

    function test_mint_with_long_metadata() public {
        string memory longUri = "0g://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabbbbbbbbcccccc";
        uint256 tokenId = identity.mintIdentity(agent, longUri);
        assertEq(identity.tokenURI(tokenId), longUri);
    }

    function test_mint_initial_resource_count_zero() public {
        uint256 tokenId = identity.mintIdentity(agent, "0g://test");
        assertEq(identity.resourceCount(tokenId), 0);
    }

    function test_mint_balance_increments() public {
        identity.mintIdentity(agent, "0g://a");
        assertEq(identity.balanceOf(agent), 1);
    }

    // ─── updateMetadata() ───

    function test_update_metadata_changes_uri() public {
        uint256 tokenId = identity.mintIdentity(agent, "0g://old");
        identity.updateMetadata(tokenId, "0g://new");
        assertEq(identity.tokenURI(tokenId), "0g://new");
    }

    function test_update_metadata_emits_event() public {
        uint256 tokenId = identity.mintIdentity(agent, "0g://old");
        vm.expectEmit(true, false, false, true);
        emit ZeroGentIdentity.MetadataUpdated(tokenId, "0g://new");
        identity.updateMetadata(tokenId, "0g://new");
    }

    function test_update_metadata_multiple_times() public {
        uint256 tokenId = identity.mintIdentity(agent, "0g://v1");
        identity.updateMetadata(tokenId, "0g://v2");
        identity.updateMetadata(tokenId, "0g://v3");
        assertEq(identity.tokenURI(tokenId), "0g://v3");
    }

    function test_update_metadata_only_admin() public {
        uint256 tokenId = identity.mintIdentity(agent, "0g://old");
        vm.prank(stranger);
        vm.expectRevert("ZGI: not admin");
        identity.updateMetadata(tokenId, "0g://new");
    }

    function test_update_metadata_nonexistent_token_reverts() public {
        vm.expectRevert(); // ERC721: invalid token ID
        identity.updateMetadata(999, "0g://new");
    }

    function test_update_metadata_to_empty() public {
        uint256 tokenId = identity.mintIdentity(agent, "0g://has-content");
        identity.updateMetadata(tokenId, "");
        assertEq(identity.tokenURI(tokenId), "");
    }

    // ─── incrementResourceCount() ───

    function test_increment_resource_count() public {
        uint256 tokenId = identity.mintIdentity(agent, "0g://meta");
        assertEq(identity.resourceCount(tokenId), 0);
        identity.incrementResourceCount(tokenId);
        assertEq(identity.resourceCount(tokenId), 1);
        identity.incrementResourceCount(tokenId);
        assertEq(identity.resourceCount(tokenId), 2);
    }

    function test_increment_many_times() public {
        uint256 tokenId = identity.mintIdentity(agent, "0g://meta");
        for (uint256 i = 0; i < 50; i++) {
            identity.incrementResourceCount(tokenId);
        }
        assertEq(identity.resourceCount(tokenId), 50);
    }

    function test_increment_only_admin() public {
        uint256 tokenId = identity.mintIdentity(agent, "0g://meta");
        vm.prank(stranger);
        vm.expectRevert("ZGI: not admin");
        identity.incrementResourceCount(tokenId);
    }

    function test_increment_nonexistent_token_reverts() public {
        vm.expectRevert(); // ERC721: invalid token ID
        identity.incrementResourceCount(999);
    }

    function test_increment_independent_per_token() public {
        uint256 t1 = identity.mintIdentity(agent, "0g://a");
        uint256 t2 = identity.mintIdentity(agent2, "0g://b");

        identity.incrementResourceCount(t1);
        identity.incrementResourceCount(t1);
        identity.incrementResourceCount(t1);
        identity.incrementResourceCount(t2);

        assertEq(identity.resourceCount(t1), 3);
        assertEq(identity.resourceCount(t2), 1);
    }

    // ─── tokenURI() ───

    function test_token_uri_nonexistent_reverts() public {
        vm.expectRevert(); // ERC721: invalid token ID
        identity.tokenURI(999);
    }

    // ─── hasIdentity() ───

    function test_has_identity_false_initially() public view {
        assertFalse(identity.hasIdentity(agent));
        assertFalse(identity.hasIdentity(address(0)));
    }

    function test_has_identity_true_after_mint() public {
        identity.mintIdentity(agent, "0g://test");
        assertTrue(identity.hasIdentity(agent));
        assertFalse(identity.hasIdentity(agent2));
    }

    // ─── ERC-721 standard behavior ───

    function test_transfer_nft() public {
        uint256 tokenId = identity.mintIdentity(agent, "0g://test");
        vm.prank(agent);
        identity.transferFrom(agent, agent2, tokenId);
        assertEq(identity.ownerOf(tokenId), agent2);
    }

    function test_transfer_does_not_change_agent_token_mapping() public {
        uint256 tokenId = identity.mintIdentity(agent, "0g://test");
        vm.prank(agent);
        identity.transferFrom(agent, agent2, tokenId);
        // agentTokenId still points to original agent
        assertEq(identity.agentTokenId(agent), tokenId);
        // New owner doesn't get mapping updated
        assertEq(identity.agentTokenId(agent2), 0);
    }

    function test_approve_and_transfer() public {
        uint256 tokenId = identity.mintIdentity(agent, "0g://test");
        vm.prank(agent);
        identity.approve(agent2, tokenId);

        vm.prank(agent2);
        identity.transferFrom(agent, agent2, tokenId);
        assertEq(identity.ownerOf(tokenId), agent2);
    }

    function test_supports_erc721_interface() public view {
        // ERC-721 interface ID: 0x80ac58cd
        assertTrue(identity.supportsInterface(0x80ac58cd));
    }

    function test_supports_erc165_interface() public view {
        // ERC-165 interface ID: 0x01ffc9a7
        assertTrue(identity.supportsInterface(0x01ffc9a7));
    }

    // ─── Multiple agents full flow ───

    function test_full_lifecycle_multiple_agents() public {
        // Mint identities
        uint256 t1 = identity.mintIdentity(agent, "0g://agent-1-meta");
        uint256 t2 = identity.mintIdentity(agent2, "0g://agent-2-meta");
        uint256 t3 = identity.mintIdentity(agent3, "0g://agent-3-meta");

        // Verify all minted
        assertTrue(identity.hasIdentity(agent));
        assertTrue(identity.hasIdentity(agent2));
        assertTrue(identity.hasIdentity(agent3));

        // Increment resources differently
        identity.incrementResourceCount(t1);
        identity.incrementResourceCount(t1);
        identity.incrementResourceCount(t2);

        assertEq(identity.resourceCount(t1), 2);
        assertEq(identity.resourceCount(t2), 1);
        assertEq(identity.resourceCount(t3), 0);

        // Update metadata
        identity.updateMetadata(t3, "0g://agent-3-meta-v2");
        assertEq(identity.tokenURI(t3), "0g://agent-3-meta-v2");

        // Verify cross-agent isolation
        assertEq(identity.tokenURI(t1), "0g://agent-1-meta");
        assertEq(identity.tokenURI(t2), "0g://agent-2-meta");
    }

    // ─── Fuzz ───

    function testFuzz_mint_any_address(address agent_) public {
        vm.assume(agent_ != address(0));
        // Avoid precompile addresses that might revert on ERC721
        vm.assume(uint160(agent_) > 0xff);

        uint256 tokenId = identity.mintIdentity(agent_, "0g://fuzz");
        assertEq(identity.ownerOf(tokenId), agent_);
        assertTrue(identity.hasIdentity(agent_));
        assertEq(identity.agentTokenId(agent_), tokenId);
    }

    function testFuzz_metadata_round_trip(string calldata uri) public {
        uint256 tokenId = identity.mintIdentity(agent, uri);
        assertEq(identity.tokenURI(tokenId), uri);

        identity.updateMetadata(tokenId, uri);
        assertEq(identity.tokenURI(tokenId), uri);
    }
}
