// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AxelarExecutable} from '@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol';
import {IAxelarGateway} from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol';
import {IAxelarGasService} from '@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol';

contract TicTacAvaxCross is AxelarExecutable {
	IAxelarGasService public immutable gasService;
	string public message;

	address[2] public players;
	uint public currentPlayer;
	uint8[3][3] public board;
	uint public roundCount;
	uint public gameCount;
	bool public gameOver;
	address public winner;
	uint public lastMoveTimestamp;
	address public lastRoundWinner;

	event GameStarted(address player1, address player2);
	event MoveMade(address player, uint8 row, uint8 col);
	event GameWon(address winner);
	event GameDraw();
	event GameReset();

	modifier onlyPlayers() {
		require(
			msg.sender == players[0] || msg.sender == players[1],
			'Not a player'
		);
		_;
	}

	modifier validMove(uint8 row, uint8 col) {
		require(!gameOver, 'Game over');
		require(row < 3 && col < 3, 'Invalid move');
		require(board[row][col] == 0, 'Cell already taken');
		_;
	}

	constructor(
		address _gateway,
		address _gasService
	) AxelarExecutable(_gateway) {
		gasService = IAxelarGasService(_gasService);
	}

	function startGame(
		string calldata _destinationChain,
		string calldata _destinationAddress,
		address playerOne,
		address playerTwo
	) public payable {
		require(
			players[0] == address(0) && players[1] == address(0),
			'Game already started'
		);
		require(
			playerOne != address(0) && playerTwo != address(0),
			'Invalid player'
		);
		require(playerOne != playerTwo, 'Players must be different');

		(string memory flag, address _playerOne, address _playerTwo) = _startGame(
			playerOne,
			playerTwo
		);

		bytes memory payload = abi.encode(flag, _playerOne, _playerTwo);

		gasService.payNativeGasForContractCall{value: msg.value}(
			address(this),
			_destinationChain,
			_destinationAddress,
			payload,
			msg.sender
		);

		gateway.callContract(_destinationChain, _destinationAddress, payload);
	}

	function makeMove(
		string calldata _destinationChain,
		string calldata _destinationAddress,
		uint8 _row,
		uint8 _col
	) public payable onlyPlayers validMove(_row, _col) {
		require(msg.sender == players[currentPlayer], 'Not your turn');

		string memory flag = _makeMove(_row, _col);

		bytes memory payload = abi.encode(flag, _row, _col);

		gasService.payNativeGasForContractCall{value: msg.value}(
			address(this),
			_destinationChain,
			_destinationAddress,
			payload,
			msg.sender
		);

		gateway.callContract(_destinationChain, _destinationAddress, payload);
	}

	function resetGame(
		string calldata _destinationChain,
		string calldata _destinationAddress
	) public payable {
		require(
			gameOver || block.timestamp > lastMoveTimestamp + 86400,
			'Game is not over yet or 24 hours have not passed'
		);

		string memory flag = _resetGame();

		bytes memory payload = abi.encode(flag);

		gasService.payNativeGasForContractCall{value: msg.value}(
			address(this),
			_destinationChain,
			_destinationAddress,
			payload,
			msg.sender
		);

		gateway.callContract(_destinationChain, _destinationAddress, payload);
	}

	/// View functions

	function getBoard() public view returns (uint8[3][3] memory) {
		return board;
	}

	/// internal functions

	function checkWin() internal view returns (bool) {
		for (uint8 i = 0; i < 3; i++) {
			if (
				(board[i][0] == board[i][1] &&
					board[i][1] == board[i][2] &&
					board[i][0] != 0) ||
				(board[0][i] == board[1][i] &&
					board[1][i] == board[2][i] &&
					board[0][i] != 0)
			) {
				return true;
			}
		}
		if (
			(board[0][0] == board[1][1] &&
				board[1][1] == board[2][2] &&
				board[0][0] != 0) ||
			(board[0][2] == board[1][1] &&
				board[1][1] == board[2][0] &&
				board[0][2] != 0)
		) {
			return true;
		}
		return false;
	}

	function checkDraw() internal view returns (bool) {
		for (uint8 i = 0; i < 3; i++) {
			for (uint8 j = 0; j < 3; j++) {
				if (board[i][j] == 0) {
					return false;
				}
			}
		}
		return !checkWin();
	}

	function _execute(
		string calldata sourceChain,
		string calldata sourceAddress,
		bytes calldata _payload
	) internal override {
		string memory flag = abi.decode(_payload, (string));

		if (
			keccak256(abi.encodePacked(flag)) ==
			keccak256(abi.encodePacked('startGame'))
		) {
			(string memory failFlag, address playerOne, address playerTwo) = abi
				.decode(_payload, (string, address, address));

			_startGame(playerOne, playerTwo);
		} else if (
			keccak256(abi.encodePacked(flag)) ==
			keccak256(abi.encodePacked('makeMove'))
		) {
			(string memory failFlag, uint8 _row, uint8 _col) = abi.decode(
				_payload,
				(string, uint8, uint8)
			);

			_makeMove(_row, _col);
		} else if (
			keccak256(abi.encodePacked(flag)) ==
			keccak256(abi.encodePacked('resetGame'))
		) {
			_resetGame();
		}
	}

	//// Private functions

	function _startGame(
		address _playerOne,
		address _playerTwo
	) private returns (string memory, address, address) {
		string memory flag = 'startGame';

		players[0] = _playerOne;
		players[1] = _playerTwo;
		currentPlayer = 0;
		gameOver = false;
		lastMoveTimestamp = block.timestamp;
		gameCount++;

		emit GameStarted(_playerOne, _playerTwo);

		return (flag, _playerOne, _playerTwo);
	}

	function _makeMove(uint8 _row, uint8 _col) private returns (string memory) {
		string memory flag = 'makeMove';

		board[_row][_col] = uint8(currentPlayer + 1);
		emit MoveMade(msg.sender, _row, _col);

		if (checkWin()) {
			gameOver = true;
			winner = msg.sender;
			lastRoundWinner = msg.sender;
			emit GameWon(msg.sender);
		} else if (checkDraw()) {
			gameOver = true;
			emit GameDraw();
		} else {
			currentPlayer = 1 - currentPlayer;
		}

		lastMoveTimestamp = block.timestamp;

		return flag;
	}

	function _resetGame() private returns (string memory) {
		string memory flag = 'resetGame';

		for (uint8 i = 0; i < 3; i++) {
			for (uint8 j = 0; j < 3; j++) {
				board[i][j] = 0;
			}
		}

		gameOver = false;
		currentPlayer = 0;
		roundCount = 0;
		winner = address(0);
		lastMoveTimestamp = block.timestamp;
		players[0] = address(0);
		players[1] = address(0);

		emit GameReset();

		return flag;
	}
}
