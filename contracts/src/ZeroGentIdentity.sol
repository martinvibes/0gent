// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @title ZeroGentIdentity
 * @notice ERC-721 identity NFT for AI agents on 0G Chain.
 *         Each agent mints one NFT. Metadata stored on 0G Storage.
 *         Token ID = agent's permanent on-chain identity.
 */
contract ZeroGentIdentity is ERC721 {
    address public admin;
    uint256 private _nextTokenId = 1;

    // agent address => token ID (0 = not minted)
    mapping(address => uint256) public agentTokenId;
    // token ID => metadata URI (0G Storage root hash or URL)
    mapping(uint256 => string) private _tokenMetadataURI;
    // token ID => resource count (updated by admin/backend)
    mapping(uint256 => uint256) public resourceCount;

    event AgentIdentityMinted(address indexed agent, uint256 indexed tokenId, string metadataURI);
    event MetadataUpdated(uint256 indexed tokenId, string metadataURI);

    modifier onlyAdmin() {
        require(msg.sender == admin, "ZGI: not admin");
        _;
    }

    constructor() ERC721("0GENT Identity", "0GENT-ID") {
        admin = msg.sender;
    }

    /**
     * @notice Mint identity NFT for an agent. One per agent.
     * @param agent The agent's wallet address
     * @param metadataURI 0G Storage root hash or URI for agent metadata
     */
    function mintIdentity(address agent, string calldata metadataURI) external onlyAdmin returns (uint256 tokenId) {
        require(agentTokenId[agent] == 0, "ZGI: already minted");
        require(agent != address(0), "ZGI: zero address");

        tokenId = _nextTokenId++;
        _mint(agent, tokenId);
        agentTokenId[agent] = tokenId;
        _tokenMetadataURI[tokenId] = metadataURI;

        emit AgentIdentityMinted(agent, tokenId, metadataURI);
    }

    function updateMetadata(uint256 tokenId, string calldata metadataURI) external onlyAdmin {
        require(ownerOf(tokenId) != address(0), "ZGI: token does not exist");
        _tokenMetadataURI[tokenId] = metadataURI;
        emit MetadataUpdated(tokenId, metadataURI);
    }

    function incrementResourceCount(uint256 tokenId) external onlyAdmin {
        require(ownerOf(tokenId) != address(0), "ZGI: token does not exist");
        resourceCount[tokenId]++;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(ownerOf(tokenId) != address(0), "ZGI: token does not exist");
        return _tokenMetadataURI[tokenId];
    }

    function hasIdentity(address agent) external view returns (bool) {
        return agentTokenId[agent] != 0;
    }
}
