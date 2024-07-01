# Author: Prof. MM Ghassemi <ghassem3@msu.edu>
from flask import current_app as app
from flask import render_template, redirect, request, session, url_for, copy_current_request_context
from flask_socketio import SocketIO, emit, join_room, leave_room, close_room, rooms, disconnect
from .utils.database.database  import database
from werkzeug.datastructures   import ImmutableMultiDict
from pprint import pprint
import json
import random
import functools
from . import socketio
db = database()

#######################################################################################
# AUTHENTICATION RELATED
#######################################################################################
def login_required(func):
    @functools.wraps(func)
    def secure_function(*args, **kwargs):
        if "email" not in session:
            return redirect(url_for("signin"))
        return func(*args, **kwargs)
    return secure_function

# Gets desired user data from session
def getUser(option):
    if 'email' in session:
        email = db.reversibleEncrypt('decrypt', session['email'])
        data = db.query(f"SELECT first_name, user_id FROM users where email=%s;", [email])[0]
        if option == "email":
            return email
        elif data and option == "id":
            return data["user_id"]
        elif data and option == "name":
            return data['first_name']
        elif option == "all":
            return data
        else:
            return "Unknown"
    else:
        return "Unknown"

# Routes to signup page
@app.route('/signup')
def signup():
    return render_template('signup.html')

# Processes signup data, adds everything to db
@app.route('/processsignup',  methods = ["POST","GET"])
def process_signup():
    # Get data from signup form
    new_user_data = dict((key, request.form.getlist(key)[0]) for key in list(request.form.keys()))
    
    # Check to see if passwords match
    if new_user_data['password'] != new_user_data['password_c']:
        return json.dumps({'success' : 2})

    email = new_user_data['email']
    password = new_user_data['password']
    first_name = new_user_data['firstname']
    last_name = new_user_data['lastname']

    # Check to see if that email is already in db
    check = db.query(f"SELECT * FROM users WHERE email=%s;", [email])
    if not check:
        db.createUser(email, password, first_name, last_name)
        result = {'success' : 1}
    else:
        result = {'success' : 0}

    return json.dumps(result)

# Routes user to signin page
@app.route('/signin')
def signin():
	return render_template('signin.html')

# Processes user signin, validates everything in db
@app.route('/processsignin', methods = ["POST","GET"])
def process_signin():
    login_data = dict((key, request.form.getlist(key)[0]) for key in list(request.form.keys()))

    # Get email and encrypted password, authenticate them
    user_email = login_data['email']
    encrypted_pw = db.onewayEncrypt(login_data['password'])
    auth_result = db.authenticate(user_email, encrypted_pw)

	# if authentication sucesssful, set session email
    if auth_result["success"] == 1:
        session['email'] = db.reversibleEncrypt('encrypt', login_data['email']) 

    return json.dumps(auth_result)

# Logs use out by popping session cookie
@app.route('/logout')
def logout():
	session.pop('email', default=None)
	return redirect('/')

#######################################################################################
# PROJECT BOARDS
#######################################################################################

# Checks to see if the user owns the given board
# Restricts access to boards that are not theirs
def getBoardName(board_id):
    query = "SELECT name FROM boards WHERE board_id=%s"
    name = db.query(query, [board_id])[0]['name']
    return name

# Determines if the user owns a given board or not
def userIsOwner(user_id, board_id):
    query = f"""
            SELECT * FROM boards
            WHERE owner_id=%s
            and board_id=%s;
            """
    results = db.query(query, [user_id, board_id])

    if results:
        return True
    return False

# Determines if a user is a member of a given board or not
def memberOfBoard(board_id):
    query = f"""
            SELECT *
            FROM users JOIN member_connections
            ON users.user_id = member_connections.user_id
            JOIN boards
            ON member_connections.board_id = boards.board_id
            WHERE users.user_id=%s
            and boards.board_id=%s;
            """
    result = db.query(query, [getUser("id"), board_id])
    if result:
        return True
    return False

# Gets all the user's boards to display in dashboard
def getBoards():
    # Query joins all three tables together to find all boards a user is a member of.
    query = f"""
            SELECT *
            FROM users JOIN member_connections
            ON users.user_id = member_connections.user_id
            JOIN boards
            ON member_connections.board_id = boards.board_id
            WHERE users.user_id=%s;
            """
    boards = db.query(query, [getUser("id")])
    return boards

# Gets all lists associated wtih board
def getLists(board_id):
    query = f"""
            SELECT *
            FROM lists
            WHERE board_id=%s;
            """
    lists = db.query(query, [board_id])
    return lists

# Gets all cards, filtered in template
def getCards():
    query = f"""
            SELECT *
            FROM cards
            """
    cards = db.query(query)
    return cards

# Creates a board in database
@app.route('/createboard', methods = ["POST","GET"])
def create_board():
    board_data = dict((key, request.form.getlist(key)[0]) for key in list(request.form.keys()))
    user_id = getUser("id")
    
    project_name = board_data['name']
    members = board_data['members']
    members = members.split(';')

    # Allows user to create board by themselves
    if members == [""]:
        members = [getUser("email")]
    else:
        members.append(getUser("email"))
    
    # Check to see if that user already has a board with that name
    board_check = db.query("SELECT * FROM boards WHERE name=%s and owner_id=%s", (project_name, user_id))

    # Check to see if all requested members have accounts
    valid_members = True
    for member in members:
        result = db.query("SELECT * FROM users WHERE email=%s", [member])
        if not result:
            valid_members = False
            break
    
    if not board_check and valid_members:
        # Insert new board information into db
        columns = ['owner_id', 'name']
        params = [[user_id, project_name]]
        db.insertRows("boards", columns, params)

        # Obtain id from above db entry
        board_id = db.query("SELECT board_id FROM boards ORDER BY board_id DESC LIMIT 1;")[0]['board_id']

        params = []
        # For every member, get their ID
        for email in members:
            user_data = db.query("SELECT user_id FROM users WHERE email=%s", [email])[0]
            columns = ['user_id', 'board_id']
            params.append([user_data['user_id'], board_id])
        
        db.insertRows("member_connections", columns, params)
        db.createList(board_id, default=True)

        print("LISTS", db.query("SELECT * FROM lists"))
        result = {"success" : 1, "id" : board_id}
    else:
        result = {"success" : 0}
        
    return json.dumps(result)

# Routes user to the requested board if they are a member of it
@app.route('/board/<id>')
def board(id):
    if memberOfBoard(id):
        return render_template('board.html', id=id, name=getBoardName(id), lists=getLists(id), cards=getCards())
    return redirect(url_for("dashboard"))

#######################################################################################
# LIVE UPDATES/CHAT (SOCKET.IO)
#######################################################################################

# Socket listener for when user joins
@socketio.on('joined', namespace='/board')
def joined(data):
    id = int(data["board_id"][0])
    join_room(id)

# Triggers when addcard is emitted in script, draws a card on specifed list
@socketio.on('addcard', namespace='/board')
def addcard(data):
    id = data["board_id"]

    columns = ["list_id", "content"]
    params = [[data["list_id"], "Enter Text Here"]]
    db.insertRows("cards", columns, params)

     # Obtain id from above db entry
    card_id = db.query("SELECT card_id FROM cards ORDER BY card_id DESC LIMIT 1;")[0]['card_id']
    content = db.query(f"SELECT content FROM cards WHERE card_id=%s", [card_id])[0]['content']
    data["card_id"] = card_id
    data["content"] = content
    
    emit('drawcard', data, room=id)

# Triggers when a card needs be to be committed to db
@socketio.on('commitcard', namespace='/board')
def commitcard(data):
    id = int(data["board_id"][0])

    new_content = data['content']
    card_id = data['card_id']
    
    query = f"UPDATE cards SET content=%s WHERE card_id=%s"
    db.query(query, (new_content, card_id))

    emit('updatecard', data, room=id)

# Triggers when a card needs to be deleted from db
@socketio.on('deletecard', namespace='/board')
def deletecard(data):
    id = int(data["board_id"][0])

    card_id = data["card_id"]
    query = f"""
            DELETE FROM cards
            WHERE card_id=%s
            """
    db.query(query, [card_id])
    emit('removecard', data, room=id)

# Triggers when a card is moved from one list to another
@socketio.on("carddragged", namespace='/board')
def carddragged(data):
    id = int(data["board_id"][0])

    source_card_id = data["source_card_id"].split('-')[1]
    dest_list_id = data["dest_list_id"].split('-')[1]

    query = f"""
            UPDATE cards
            SET list_id=%s
            WHERE card_id=%s;
            """
    db.query(query, [dest_list_id, source_card_id])
    emit('completedrag', data, room=id)

# Triggers when a chat event occurs
@socketio.on("chatstatus", namespace='/board')
def joinedchat(data):
    id = int(data["board_id"][0])

    if userIsOwner(getUser("id"), id):
        style = "text-align: right; margin-bottom: 0.5rem; font-weight: bold;"
    else:
        style = "text-align: left; margin-bottom: 0.5rem; font-weight: bold;"

    if data["joined"] == 1:
        style += "color: #53A653"
        emit("incomingmsg", {"msg" : getUser("name") + " has joined", "style" : style}, room=id)
    else:
        style += "color: #E60000"
        emit("incomingmsg", {"msg" : getUser("name") + " has left", "style" : style}, room=id)

# Triggers when a message is sent through the chat
@socketio.on("message-sent", namespace='/board')
def messagesent(data):
    id = int(data["board_id"][0])

    if userIsOwner(getUser("id"), id):
        style = "text-align: right; margin-bottom: 0.5rem;"
    else:
        style = "text-align: left; margin-bottom: 0.5rem;"

    emit("incomingmsg", {"msg" : getUser("name") + " said: " + data["msg"], "style" : style}, room=id)


#######################################################################################
# OTHER
#######################################################################################

# Default route
@app.route('/')
def root():
	return redirect('/signin')

# User's personalized dashboard page
@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', user=getUser("all"), boards=getBoards())

@app.route("/static/<path:path>")
def static_dir(path):
    return send_from_directory("static", path)

@app.after_request
def add_header(r):
    r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, public, max-age=0"
    r.headers["Pragma"] = "no-cache"
    r.headers["Expires"] = "0"
    return r