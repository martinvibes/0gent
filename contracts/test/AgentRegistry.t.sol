// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry public registry;
    address public deployer;
    address public agent = makeAddr("agent");
    address public agent2 = makeAddr("agent2");
    address public agent3 = makeAddr("agent3");
    address public stranger = makeAddr("stranger");

    function setUp() public {
        deployer = address(this);
        registry = new AgentRegistry();
    }

    // ─── Constructor ───

    function test_constructor_sets_admin() public view {
        assertEq(registry.admin(), deployer);
    }

    // ─── registerResource() ───

    function test_register_phone() public {
        uint256 expires = block.timestamp + 30 days;
        uint256 id = registry.registerResource(agent, AgentRegistry.ResourceType.Phone, "+15551234567", expires);
        assertEq(id, 1);

        AgentRegistry.Resource memory r = registry.getResource(id);
        assertEq(uint8(r.resourceType), uint8(AgentRegistry.ResourceType.Phone));
        assertEq(uint8(r.status), uint8(AgentRegistry.ResourceStatus.Active));
        assertEq(r.providerRef, "+15551234567");
        assertEq(r.createdAt, block.timestamp);
        assertEq(r.expiresAt, expires);
        assertEq(r.id, 1);
    }

    function test_register_email() public {
        uint256 id = registry.registerResource(agent, AgentRegistry.ResourceType.Email, "bot@0gent.xyz", block.timestamp + 30 days);
        AgentRegistry.Resource memory r = registry.getResource(id);
        assertEq(uint8(r.resourceType), uint8(AgentRegistry.ResourceType.Email));
        assertEq(r.providerRef, "bot@0gent.xyz");
    }

    function test_register_compute() public {
        uint256 id = registry.registerResource(agent, AgentRegistry.ResourceType.Compute, "192.168.1.100", block.timestamp + 30 days);
        AgentRegistry.Resource memory r = registry.getResource(id);
        assertEq(uint8(r.resourceType), uint8(AgentRegistry.ResourceType.Compute));
        assertEq(r.providerRef, "192.168.1.100");
    }

    function test_register_domain() public {
        uint256 id = registry.registerResource(agent, AgentRegistry.ResourceType.Domain, "myagent.dev", block.timestamp + 365 days);
        AgentRegistry.Resource memory r = registry.getResource(id);
        assertEq(uint8(r.resourceType), uint8(AgentRegistry.ResourceType.Domain));
        assertEq(r.providerRef, "myagent.dev");
    }

    function test_register_increments_ids() public {
        uint256 id1 = registry.registerResource(agent, AgentRegistry.ResourceType.Phone, "+1", block.timestamp + 30 days);
        uint256 id2 = registry.registerResource(agent, AgentRegistry.ResourceType.Email, "a@b", block.timestamp + 30 days);
        uint256 id3 = registry.registerResource(agent2, AgentRegistry.ResourceType.Compute, "1.2.3.4", block.timestamp + 30 days);
        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(id3, 3);
    }

    function test_register_emits_event() public {
        uint256 expires = block.timestamp + 30 days;
        vm.expectEmit(true, true, false, true);
        emit AgentRegistry.ResourceRegistered(agent, 1, AgentRegistry.ResourceType.Phone, "+1555", expires);
        registry.registerResource(agent, AgentRegistry.ResourceType.Phone, "+1555", expires);
    }

    function test_register_with_empty_provider_ref() public {
        uint256 id = registry.registerResource(agent, AgentRegistry.ResourceType.Phone, "", block.timestamp + 30 days);
        AgentRegistry.Resource memory r = registry.getResource(id);
        assertEq(r.providerRef, "");
    }

    function test_register_with_zero_expiry() public {
        uint256 id = registry.registerResource(agent, AgentRegistry.ResourceType.Phone, "+1", 0);
        AgentRegistry.Resource memory r = registry.getResource(id);
        assertEq(r.expiresAt, 0);
    }

    function test_register_for_zero_address() public {
        uint256 id = registry.registerResource(address(0), AgentRegistry.ResourceType.Phone, "+1", block.timestamp + 30 days);
        assertEq(registry.getResourceOwner(id), address(0));
    }

    function test_register_only_admin() public {
        vm.prank(stranger);
        vm.expectRevert("AR: not admin");
        registry.registerResource(agent, AgentRegistry.ResourceType.Phone, "+1", block.timestamp + 30 days);
    }

    function test_register_different_agents_get_separate_lists() public {
        registry.registerResource(agent, AgentRegistry.ResourceType.Phone, "+1", block.timestamp + 30 days);
        registry.registerResource(agent, AgentRegistry.ResourceType.Email, "a@b", block.timestamp + 30 days);
        registry.registerResource(agent2, AgentRegistry.ResourceType.Compute, "1.2.3.4", block.timestamp + 30 days);

        assertEq(registry.getAgentResourceCount(agent), 2);
        assertEq(registry.getAgentResourceCount(agent2), 1);
        assertEq(registry.getAgentResourceCount(agent3), 0);
    }

    // ─── getAgentResourceIds() ───

    function test_agent_resource_ids_ordered() public {
        uint256 id1 = registry.registerResource(agent, AgentRegistry.ResourceType.Phone, "+1", block.timestamp + 30 days);
        uint256 id2 = registry.registerResource(agent, AgentRegistry.ResourceType.Email, "a@b", block.timestamp + 30 days);
        uint256 id3 = registry.registerResource(agent, AgentRegistry.ResourceType.Domain, "x.dev", block.timestamp + 365 days);

        uint256[] memory ids = registry.getAgentResourceIds(agent);
        assertEq(ids.length, 3);
        assertEq(ids[0], id1);
        assertEq(ids[1], id2);
        assertEq(ids[2], id3);
    }

    function test_agent_with_no_resources_returns_empty() public view {
        uint256[] memory ids = registry.getAgentResourceIds(agent);
        assertEq(ids.length, 0);
        assertEq(registry.getAgentResourceCount(agent), 0);
    }

    // ─── deactivateResource() ───

    function test_deactivate_changes_status() public {
        uint256 id = registry.registerResource(agent, AgentRegistry.ResourceType.Phone, "+1", block.timestamp + 30 days);
        assertEq(uint8(registry.getResource(id).status), uint8(AgentRegistry.ResourceStatus.Active));

        registry.deactivateResource(id);
        assertEq(uint8(registry.getResource(id).status), uint8(AgentRegistry.ResourceStatus.Inactive));
    }

    function test_deactivate_emits_event() public {
        uint256 id = registry.registerResource(agent, AgentRegistry.ResourceType.Phone, "+1", block.timestamp + 30 days);
        vm.expectEmit(true, false, false, false);
        emit AgentRegistry.ResourceDeactivated(id);
        registry.deactivateResource(id);
    }

    function test_deactivate_preserves_other_fields() public {
        uint256 expires = block.timestamp + 30 days;
        uint256 id = registry.registerResource(agent, AgentRegistry.ResourceType.Email, "bot@0gent.xyz", expires);

        registry.deactivateResource(id);

        AgentRegistry.Resource memory r = registry.getResource(id);
        assertEq(r.providerRef, "bot@0gent.xyz");
        assertEq(uint8(r.resourceType), uint8(AgentRegistry.ResourceType.Email));
        assertEq(r.expiresAt, expires);
        assertEq(r.id, id);
    }

    function test_deactivate_twice_still_inactive() public {
        uint256 id = registry.registerResource(agent, AgentRegistry.ResourceType.Phone, "+1", block.timestamp + 30 days);
        registry.deactivateResource(id);
        registry.deactivateResource(id); // should not revert
        assertEq(uint8(registry.getResource(id).status), uint8(AgentRegistry.ResourceStatus.Inactive));
    }

    function test_deactivate_nonexistent_reverts() public {
        vm.expectRevert("AR: resource not found");
        registry.deactivateResource(999);
    }

    function test_deactivate_only_admin() public {
        uint256 id = registry.registerResource(agent, AgentRegistry.ResourceType.Phone, "+1", block.timestamp + 30 days);
        vm.prank(stranger);
        vm.expectRevert("AR: not admin");
        registry.deactivateResource(id);
    }

    function test_deactivate_does_not_remove_from_agent_list() public {
        uint256 id = registry.registerResource(agent, AgentRegistry.ResourceType.Phone, "+1", block.timestamp + 30 days);
        registry.deactivateResource(id);
        // Still appears in agent's resource list
        assertEq(registry.getAgentResourceCount(agent), 1);
        uint256[] memory ids = registry.getAgentResourceIds(agent);
        assertEq(ids[0], id);
    }

    // ─── getResource() ───

    function test_get_nonexistent_resource_reverts() public {
        vm.expectRevert("AR: resource not found");
        registry.getResource(0);
    }

    function test_get_resource_returns_correct_data() public {
        uint256 expires = block.timestamp + 60 days;
        uint256 id = registry.registerResource(agent, AgentRegistry.ResourceType.Compute, "10.0.0.1", expires);

        AgentRegistry.Resource memory r = registry.getResource(id);
        assertEq(r.id, id);
        assertEq(uint8(r.resourceType), uint8(AgentRegistry.ResourceType.Compute));
        assertEq(uint8(r.status), uint8(AgentRegistry.ResourceStatus.Active));
        assertEq(r.providerRef, "10.0.0.1");
        assertEq(r.createdAt, block.timestamp);
        assertEq(r.expiresAt, expires);
    }

    // ─── getResourceOwner() ───

    function test_resource_owner_correct() public {
        uint256 id = registry.registerResource(agent, AgentRegistry.ResourceType.Domain, "agent.ai", block.timestamp + 365 days);
        assertEq(registry.getResourceOwner(id), agent);
    }

    function test_resource_owner_zero_for_nonexistent() public view {
        assertEq(registry.getResourceOwner(999), address(0));
    }

    function test_resource_owner_after_deactivation() public {
        uint256 id = registry.registerResource(agent, AgentRegistry.ResourceType.Phone, "+1", block.timestamp + 30 days);
        registry.deactivateResource(id);
        // Owner should still be the same after deactivation
        assertEq(registry.getResourceOwner(id), agent);
    }

    // ─── Stress / many resources ───

    function test_register_many_resources_for_one_agent() public {
        for (uint256 i = 0; i < 20; i++) {
            registry.registerResource(
                agent,
                AgentRegistry.ResourceType(i % 4),
                string(abi.encodePacked("resource-", vm.toString(i))),
                block.timestamp + 30 days
            );
        }
        assertEq(registry.getAgentResourceCount(agent), 20);
        uint256[] memory ids = registry.getAgentResourceIds(agent);
        assertEq(ids.length, 20);
        assertEq(ids[0], 1);
        assertEq(ids[19], 20);
    }

    // ─── Fuzz ───

    function testFuzz_register_and_retrieve(address agent_, uint8 typeRaw, uint256 expires) public {
        AgentRegistry.ResourceType rt = AgentRegistry.ResourceType(typeRaw % 4);
        uint256 id = registry.registerResource(agent_, rt, "fuzz-ref", expires);

        AgentRegistry.Resource memory r = registry.getResource(id);
        assertEq(uint8(r.resourceType), uint8(rt));
        assertEq(r.expiresAt, expires);
        assertEq(registry.getResourceOwner(id), agent_);
    }
}
