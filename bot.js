const mineflayer = require('mineflayer')
const mineflayerViewer = require('prismarine-viewer').mineflayer
const vec3 = require('vec3')

const { pathfinder, Movements, goals: { GoalNear } } = require('mineflayer-pathfinder')


const bot = mineflayer.createBot({
  host: "3.230.142.29"// '34.239.154.0',             // minecraft server ip
  //port: 42031
})

bot.loadPlugin(pathfinder)

// if (process.argv.length < 4 || process.argv.length > 6) {
//   console.log('Usage : node digger.js <host> <port> [<name>] [<password>]')
//   process.exit(1)
// }
// const bot = mineflayer.createBot({
//   host: process.argv[2],
//   port: parseInt(process.argv[3]),
//   username: process.argv[4] ? process.argv[4] : 'digger',
//   password: process.argv[5]
// })

const RANGE_GOAL = 1 // get within this radius of the player 


let stop = false


bot.once('spawn', () => {
//   mineflayerViewer(bot, { port: 3007, firstPerson: false })

    bot.mcData = require('minecraft-data')(bot.version)
    const defaultMove = new Movements(bot, bot.mcData)

    bot.on('chat', async (username, message) => {
        if (username === bot.username) return

        args = message.split(" ")
        argn = args.length
        command = args[0]

        stop = false
        switch (command) {
            case 'loaded':
                await bot.waitForChunksToLoad()
                bot.chat('Ready!')
                break
            case 'list':
                sayItems()
                break
            case 'dig':
                dig()
                break
            case 'build':
                build()
                break
            case 'equip':
                equipItem(args[1])
                break
            case 'come':
                come(username,defaultMove)
                break
            case 'quarry':
                if(argn !== 3)
                {
                    bot.chat("Usage: quarry radius depth")
                    return
                }
                radius = eval(args[1])
                depth = eval(args[2])
                quarry(radius, depth)
                break
            case 'stop':
                stop = true
                break
            case 'dump':

                break
        }
    })
})








async function quarry(radius,depth)
{


}




function is_diggable(center, x_offset, y_offset, z_offset)
{
    target = center.offset(x_offset, y_offset, z_offset)
    if(!quarry_can_dig(bot.blockAt(target)))
    {
        bot.chat("Stopping Quarry: found undiggable block at "+target.x+", "+target.y+", "+target.z)
        bot.pathfinder.goto(make_goal_near(target, 2))
        return false;
    }
    return true;
}







