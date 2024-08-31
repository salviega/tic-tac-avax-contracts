// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TicTacAvax {
	address[2] public players;
	uint public currentPlayer;
	uint8[3][3] public board;
	uint public roundCount;
	bool public gameOver;
	uint public lastMoveTimestamp;

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

	constructor() payable {
		require(msg.value > 0, 'Funds are required to deploy the contract');
	}

	function startGame(address playerOne, address playerTwo) public {
		require(
			players[0] == address(0) && players[1] == address(0),
			'Game already started'
		);
		require(
			playerOne != address(0) && playerTwo != address(0),
			'Invalid player'
		);
		require(playerOne != playerTwo, 'Players must be different');

		players[0] = playerOne;
		players[1] = playerTwo;
		currentPlayer = 0;
		gameOver = false;
		roundCount++;
		lastMoveTimestamp = block.timestamp;

		emit GameStarted(playerOne, playerTwo);
	}

	function makeMove(
		uint8 row,
		uint8 col
	) public onlyPlayers validMove(row, col) {
		require(msg.sender == players[currentPlayer], 'Not your turn');

		board[row][col] = uint8(currentPlayer + 1);
		emit MoveMade(msg.sender, row, col);

		if (checkWin()) {
			gameOver = true;
			emit GameWon(msg.sender);
		} else if (checkDraw()) {
			gameOver = true;
			emit GameDraw();
		} else {
			currentPlayer = 1 - currentPlayer;
		}

		lastMoveTimestamp = block.timestamp;
	}

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

	function resetGame() public {
		require(
			gameOver || block.timestamp > lastMoveTimestamp + 86400,
			'Game is not over yet or 24 hours have not passed'
		);

		for (uint8 i = 0; i < 3; i++) {
			for (uint8 j = 0; j < 3; j++) {
				board[i][j] = 0;
			}
		}

		gameOver = false;
		currentPlayer = 0;
		roundCount++;
		lastMoveTimestamp = block.timestamp;
		players[0] = address(0);
		players[1] = address(0);

		emit GameReset();
	}

	function getBoard() public view returns (uint8[3][3] memory) {
		return board;
	}
}
