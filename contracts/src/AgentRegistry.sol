// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AgentRegistry
 * @notice On-chain registry of resources owned by AI agents.
 *         Backend calls registerResource() after provisioning.
 *         Agents can query their resources directly on-chain.
 */
contract AgentRegistry {
    address public admin;

    enum ResourceType { Phone, Email, Compute, Domain }
    enum ResourceStatus { Active, Inactive, Expired }

    struct Resource {
        uint256 id;
        ResourceType resourceType;
        ResourceStatus status;
        string providerRef;     // e.g. phone number, email address, server IP
        uint256 createdAt;
        uint256 expiresAt;
    }

    uint256 private _nextId = 1;

    // agent address => resource IDs
    mapping(address => uint256[]) private _agentResources;
    // resource ID => Resource
    mapping(uint256 => Resource) private _resources;
    // resource ID => owner
    mapping(uint256 => address) private _resourceOwner;

    event ResourceRegistered(
        address indexed agent,
        uint256 indexed resourceId,
        ResourceType resourceType,
        string providerRef,
        uint256 expiresAt
    );

    event ResourceDeactivated(uint256 indexed resourceId);

    modifier onlyAdmin() {
        require(msg.sender == admin, "AR: not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function registerResource(
        address agent,
        ResourceType resourceType,
        string calldata providerRef,
        uint256 expiresAt
    ) external onlyAdmin returns (uint256 resourceId) {
        resourceId = _nextId++;

        _resources[resourceId] = Resource({
            id: resourceId,
            resourceType: resourceType,
            status: ResourceStatus.Active,
            providerRef: providerRef,
            createdAt: block.timestamp,
            expiresAt: expiresAt
        });

        _resourceOwner[resourceId] = agent;
        _agentResources[agent].push(resourceId);

        emit ResourceRegistered(agent, resourceId, resourceType, providerRef, expiresAt);
    }

    function deactivateResource(uint256 resourceId) external onlyAdmin {
        require(_resources[resourceId].createdAt != 0, "AR: resource not found");
        _resources[resourceId].status = ResourceStatus.Inactive;
        emit ResourceDeactivated(resourceId);
    }

    function getResource(uint256 resourceId) external view returns (Resource memory) {
        require(_resources[resourceId].createdAt != 0, "AR: resource not found");
        return _resources[resourceId];
    }

    function getAgentResourceIds(address agent) external view returns (uint256[] memory) {
        return _agentResources[agent];
    }

    function getAgentResourceCount(address agent) external view returns (uint256) {
        return _agentResources[agent].length;
    }

    function getResourceOwner(uint256 resourceId) external view returns (address) {
        return _resourceOwner[resourceId];
    }
}
