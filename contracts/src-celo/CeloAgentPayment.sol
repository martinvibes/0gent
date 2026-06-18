// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract CeloAgentPayment is ReentrancyGuard {
    address public owner;
    IERC20 public immutable token;
    uint256 public totalReceived;
    mapping(bytes32 => bool) public usedNonces;

    event PaymentReceived(
        address indexed payer,
        uint256 amount,
        bytes32 indexed nonce,
        string resourceType,
        uint256 timestamp
    );
    event Withdrawn(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _token) {
        require(_token != address(0), "Invalid token");
        owner = msg.sender;
        token = IERC20(_token);
    }

    function pay(
        bytes32 nonce,
        string calldata resourceType,
        uint256 amount
    ) external nonReentrant {
        require(amount > 0, "Zero amount");
        require(!usedNonces[nonce], "Nonce already used");

        usedNonces[nonce] = true;
        totalReceived += amount;

        bool success = token.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");

        emit PaymentReceived(msg.sender, amount, nonce, resourceType, block.timestamp);
    }

    function withdraw(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");
        require(amount > 0, "Zero amount");
        require(token.balanceOf(address(this)) >= amount, "Insufficient balance");

        bool success = token.transfer(to, amount);
        require(success, "Transfer failed");

        emit Withdrawn(to, amount);
    }

    function isNonceUsed(bytes32 nonce) external view returns (bool) {
        return usedNonces[nonce];
    }
}
