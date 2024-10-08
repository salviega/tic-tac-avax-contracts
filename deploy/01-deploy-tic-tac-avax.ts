import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction, DeployResult } from 'hardhat-deploy/dist/types'

import { developmentChains, networkConfig } from '../helper-hardhat-config'
import { verify } from '../helpers/verify'

const deployTicTacAvax: DeployFunction = async function (
	hre: HardhatRuntimeEnvironment
) {
	const { getNamedAccounts, deployments, network } = hre
	const { log, deploy } = deployments
	const { deployer } = await getNamedAccounts()

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const args: any[] = []

	log('-----------------------------------')
	log('Deploying Tic Tac Avax...')

	const ticTacAvaxDeployment: DeployResult = await deploy('TicTacAvax', {
		from: deployer,
		args,
		log: true,
		gasLimit: 15000000,
		waitConfirmations: networkConfig[network.name].blockConfirmations || 1
	})

	if (developmentChains.includes(network.name)) {
		await verify(ticTacAvaxDeployment.address, args)
	}
}

deployTicTacAvax.tags = ['TicTacAvax']
export default deployTicTacAvax
