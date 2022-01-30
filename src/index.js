const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname + '/../public')

//set up static directory to serve
app.use(express.static(publicDirectoryPath))


//Server(emits) --> Client(receives) --acknowledgement --> Server
//Client(emits) --> Server(receives) --acknowledgement --> Client 

io.on('connection', (socket) => {
    console.log('New WebSocket Connection')



    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options })

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined`))
        io.to(user.room).emit('roomData',{
            room: user.room,
            users : getUsersInRoom(user.room)
        })

        callback()

    })


    socket.on('sendMessage', (inputText, callback) => {
        const filter = new Filter()
        const user = getUser(socket.id)

        if (filter.isProfane(inputText)) {
            return callback('Profanity is not allowed')
        }

        io.to(user.room).emit('message', generateMessage(user.username, inputText))
        callback()
    })

    socket.on('sendLocation', ({ lat, long } = {}, callback) => {
        const user = getUser(socket.id)

        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${lat},${long}`))
        callback()
    })


    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left the chat!`))
            io.to(user.room).emit('roomData',{
                room : user.room,
                users : getUsersInRoom(user.room)
            })
        }

       
    })



})


server.listen(port, () => {
    console.log(`Server is up and running on port ${port}`)
})