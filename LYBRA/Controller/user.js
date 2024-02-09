const Model = require("../Model/index");
const access_Token = require("../Get_AccessToken/createToken");
const DAO = require("../DAO/index");
const moment = require("moment");
const aggregate_ = require("../Aggregation /index");
const { is_friend, timeLeft, get_result } = require("./common");
const notification = require("./notification");

// User SignUp
const Login_signUp = async (payload) => {
  try {
    const set_otp = 12345;

    let set_data = {
      lastLoginTime: moment().valueOf(),
      tokenGenerateAt: moment().valueOf(),
      deviceType: payload.deviceType,
      deviceToken: payload.deviceToken,
      otp: set_otp,
    };

    //Find if User allready exist and return User
    let User = await DAO.get_single_data(Model.user, {
      countryCode: payload.countryCode,
      phoneNumber: payload.phoneNumber,
    });

    if (!User) {
      // SignUp
      User = await DAO.save_data(Model.user, payload);
      await notification.welcome(User);
    }

    // update token
    let token = await access_Token.generateToken({ _id: User._id });
    set_data.accessToken = token;

    let update_token = await DAO.find_and_update_database(
      Model.user,
      { _id: User._id },
      set_data,
      { new: true }
    );

    return update_token;
  } catch (err) {
    throw err;
  }
};

// social login
const social_login = async (payload) => {
  try {
    // Check if the user is already in the database
    let user = await DAO.get_single_data(Model.user, {
      socialKey: payload.socialKey,
    });
    if (!user) {
      // If the user doesn't exist, create a new user in the database
      user = await DAO.save_data(Model.user, {
        socialKey: payload.socialKey,
        socialLogin: true,
      });
      await notification.welcome(user);
    }
    //update accesstoken
    let token = await access_Token.generateToken({ _id: user._id });
    let update_token = await DAO.find_and_update_database(
      Model.user,
      { _id: user._id },
      { accessToken: token },
      { new: true }
    );
    return update_token;
  } catch (err) {
    return err;
  }
};

// LogOut
const logout = async (user) => {
  try {
    let user_logout = await DAO.find_and_update_database(
      Model.user,
      { _id: user._id },
      { accessToken: null },
      { new: true }
    );
    return "Logout succesfull";
  } catch (err) {
    throw err;
  }
};

// OTP validation
const verifyOtp = async (payload) => {
  try {
    const find_user = await DAO.get_single_data(Model.user, {
      countryCode: payload.countryCode,
      phoneNumber: payload.phoneNumber,
    });
    if (!find_user) {
      throw "user not found";
    }
    if (find_user.otp != payload.otp) {
      throw "otp incorrect";
    }
    let Verified = await DAO.find_and_update_database(
      Model.user,
      { _id: find_user._id },
      { otp_verified: true },
      { new: true }
    );
    return Verified;
  } catch (err) {
    throw err;
  }
};

// Profile SetUp
const setUp_Profile = async (payload, getUser) => {
  try {
    let getDetails = {
      name: payload.name,
      gender: payload.gender,
      dob: payload.dob,
      userName: payload.userName,
      email: payload.email,
      image: payload.image,
      profileSetup: true,
    };
    let update_profile = await DAO.find_and_update_database(
      Model.user,
      {
        _id: getUser._id, // from authorization
        profileSetup: false,
        $or: [{ otp_verified: true }, { socialLogin: true }],
      }, // to find
      getDetails, // update1
      { new: true }
    );
    return update_profile;
  } catch (err) {
    throw err;
  }
};

// Profile edit
const edit_Profile = async (payload, getUser) => {
  try {
    const dobTimestamp = payload.dob;
    let getDetails = {
      name: payload.name,
      bio: payload.bio,
      gender: payload.gender,
      dob: dobTimestamp,
      countryCode: payload.countryCode,
      country: payload.country,
      phoneNumber: payload.phoneNumber,
      userName: payload.userName,
      email: payload.email,
      image: payload.image,
    };
    let update_profile = await DAO.find_and_update_database(
      Model.user,
      { _id: getUser._id }, // to find
      getDetails, // update
      { new: true }
    );
    return update_profile;
  } catch (err) {
    throw err;
  }
};

// viewonBoarding
const viewonBoarding = async (payload) => {
  try {
    const getonBoarding = await DAO.get_all_data(Model.getOnboard, {
      isDeleted: payload.isDeleted,
    });
    return getonBoarding;
  } catch (err) {
    throw err;
  }
};

// Get Terms and Conditions1
const get_termsConditions = async (payload) => {
  try {
    const getList = await DAO.get_all_data(Model.termsConditions, {
      isDeleted: payload.isDeleted,
    });
    return getList;
  } catch (err) {
    throw err;
  }
};

// Get Privacy Policy
const get_privacyPolicy = async (payload) => {
  try {
    const getList = await DAO.get_all_data(Model.privacyPolicy, {
      isDeleted: payload.isDeleted,
    });
    return getList;
  } catch (err) {
    throw err;
  }
};

// suggest user name
const suggest_username = async (user) => {
  try {
    let username_list = [];
    let birthDate = moment(user.dob);

    // Array of date format strings
    const dateFormats = ["YYYY", "MM", "DD"];

    // Iterate through date formats and push corresponding usernames
    dateFormats.forEach((format) => {
      const formattedDate = birthDate.format(format);
      username_list.push(`${user.name.toLowerCase()}_${formattedDate}`);
    });

    const query = {
      userName: { $in: username_list },
    };

    const existingUsers = await DAO.get_all_data(Model.user, query);

    // Remove existing usernames from the list
    existingUsers.forEach((existingUser) => {
      const index = username_list.indexOf(existingUser.userName);
      if (index !== -1) {
        username_list.splice(index, 1);
      }
    });

    return username_list;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

// create Post
const add_edit_post = async (payload, user) => {
  try {
    let dateNow = Date.now();
    // save the duration in millisecond
    let futureTimestamp = moment(dateNow)
      .add(payload.duration, "days")
      .valueOf();

    let to_update = {
      image: payload.image,
      discription: payload.discription,
      duration: futureTimestamp,
      postType: payload.postType,
    };
    let find_update_Post = await DAO.find_and_update_database(
      Model.post,
      { _id: payload._id },
      to_update,
      { new: true }
    );
    if (find_update_Post) {
      return find_update_Post;
    } else {
      payload.userId = user._id;
      payload.duration = futureTimestamp;
      let createPost = await DAO.save_data(Model.post, payload);
      await notification.invited_user_post(createPost);
      return createPost;
    }
  } catch (err) {
    throw err;
  }
};

// delete_posts
const delete_posts = async (payload, user) => {
  try {
    const getPosts = await DAO.find_and_update_database(
      Model.post,
      { _id: payload._id, userId: user._id },
      { isDeleted: true },
      { new: true }
    );
    return getPosts;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

// send Friend req
const send_friendreq = async (payload, user) => {
  try {
    //check if allready friend
    let friend = await DAO.get_single_data(Model.friends, {
      $or: [
        { $and: [{ request_to_id: payload }, { request_by_id: user }] },
        { $and: [{ request_to_id: user }, { request_by_id: payload }] },
      ],
    });
    if (!friend) {
      // send friend req
      let set_data = {
        request_to_id: payload._id,
        request_by_id: user._id,
      };
      friend = await DAO.save_data(Model.friends, set_data);
      await notification.send_friend_req(friend);
    }
    return friend;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

// respond to  Friend req
const respond_to_friend_req = async (payload, user) => {
  try {
    const updateFriendsCount = async (userId, increment) => {
      return DAO.find_and_update_database(
        Model.user,
        { _id: userId },
        { $inc: { friendsCount: increment } },
        { new: true }
      );
    };
    // Get the friend request and update its status
    let request = await DAO.find_and_update_database(
      Model.friends,
      { _id: payload._id, status: "pending", request_to_id: user._id },
      { status: payload.status },
      { new: true }
    );
    // if approved
    if (request.status === "approved") {
      // Update friendsCount for the user making the request
      const update_friendcount_requestby = await updateFriendsCount(
        request.request_by_id,
        1
      );
      // Update friendsCount for the user being requested to be friends
      const update_friendcount_requestedto = await updateFriendsCount(
        request.request_to_id,
        1
      );
    }

    // if rejected
    if (request.status === "rejected") {
      // If the request is rejected, mark it as deleted
      request = await DAO.find_and_update_database(
        Model.friends,
        { _id: payload._id },
        { isDeleted: true },
        { new: true }
      );
    }
    await notification.respond_to_friend_req(request);
    return request;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

// remove friend

const remove_friend = async (payload, user) => {
  try {
    // if we are entring the token of request_by_id then the id will be of request_to_id
    // Fetch the friend and update the delete key to true
    let Find_and_remove_friend = await DAO.find_and_update_database(
      Model.friends,
      {
        $or: [
          {
            $and: [{ request_by_id: payload._id }, { request_to_id: user._id }],
          },
          {
            $and: [{ request_by_id: user._id }, { request_to_id: payload._id }],
          },
        ],
      },
      { isDeleted: true },
      { new: true }
    );
    if (Find_and_remove_friend) {
      // Update friendsCount by decrementing for each user
      let update_friend_count_requestedby = await DAO.find_and_update_database(
        Model.user,
        { _id: Find_and_remove_friend.request_by_id },
        { $inc: { friendsCount: -1 } },
        { new: true }
      );

      let update_friend_count_requestedto = await DAO.find_and_update_database(
        Model.user,
        { _id: Find_and_remove_friend.request_to_id },
        { $inc: { friendsCount: -1 } },
        { new: true }
      );
    }
    return Find_and_remove_friend;
  } catch (err) {
    throw err;
  }
};

// friend list for user
const userfriendList = async (payload, user) => {
  try {
    let friendList = await DAO.get_all_data(Model.friends, {
      // check for both cases where the userId could have been saved
      $or: [{ request_by_id: user._id }, { request_to_id: user._id }],
      // if req allready send check status
      status: "approved",
      isDeleted: payload.isDeleted,
    });
    return friendList;
  } catch (err) {
    throw err;
  }
};

// vier my profile (when user is viewing his profile)
const myprofile = async (payload, user) => {
  try {
    let getProfile = await DAO.get_single_data(Model.user, {
      _id: user._id,
      isDeleted: payload.isDeleted,
    });
    let showDetails = {
      name: getProfile.name,
      bio: getProfile.bio,
      gender: getProfile.gender,
      dob: getProfile.dob,
      countryCode: getProfile.countryCode,
      country: getProfile.country,
      phoneNumber: getProfile.phoneNumber,
      userName: getProfile.userName,
      email: getProfile.email,
      image: getProfile.image,
      totalvote_count: getProfile.totalvote_count,
      post_following_count: getProfile.post_following_count,
      friendsCount: getProfile.friendsCount,
    };
    return showDetails;
  } catch (err) {
    throw err;
  }
};

// post followed by user listing
const get_followed_posts = async (payload, user) => {
  try {
    // Use $or in the query to check if user._id matches either request_to_id or request_by_id
    let isallowed = await is_friend(user._id);
    console.log("isallowed", isallowed);
    let followed_post_list = null;

    // If there is at least one friend relationship
    if (isallowed.length) {
      // Retrieve the list of posts followed by the specified user
      followed_post_list = await DAO.get_all_data(Model.postFollower, {
        followedBy: payload._id,
        isDeleted: false,
      });
    }
    return followed_post_list; // This will be null if the user is not allowed or if there are no followed posts
  } catch (err) {
    console.error(err);
    throw err;
  }
};

// homepage_posts.js

const homepage_posts = async (payload, user) => {
  try {
    // Call get_result function
    await get_result();
    const get_post = await DAO.get_all_data(Model.post, {
      userId: { $ne: user._id },
      $or: [{ invited_user_id: user._id }, { postType: "Open" }],
      isDeleted: payload.isDeleted,
      isExpired: false,
    });

    return {
      get_post,
    };
  } catch (err) {
    console.error(err);
    throw err;
  }
};

// uploade post after joinning
const participant_post_upload = async (payload, user) => {
  try {
    const set_data = {
      participant_id: user._id,
      participant_joined: true,
      participant_post_discription: payload.discription,
      participant_post_time: moment().valueOf(),
      participant_post_Image: payload.image,
    };

    let update_data = await DAO.find_and_update_database(
      Model.post,
      {
        _id: payload._id,
        participant_joined: false,
        isDeleted: false,
        isExpired: false,
      },
      set_data,
      { new: true }
    );
    if (update_data) {
      await notification.join_post(update_data);
      return update_data;
    } else {
      throw err;
    }
  } catch (err) {
    console.log(err);
    throw err;
  }
};

// reply to post
const reply_to_post = async (payload, user) => {
  try {
    let save_data = {
      postId: payload._id,
      replyBy: user._id,
      image: payload.image,
      discription: payload.discription,
    };
    const save_reply = await DAO.save_data(Model.postReply, save_data);
    await notification.post_reply(save_reply);
    return save_reply;
  } catch (err) {
    throw err;
  }
};

// follow a post
const save_post_followers = async (payload, user) => {
  try {
    // check if allready followed
    const is_followed = await DAO.find_and_update_database(
      Model.postFollower,
      {
        followedBy: user._id,
        postId: payload._id,
        isDeleted: false,
      },
      { isDeleted: true },
      { new: true }
    );

    if (is_followed) {
      const unfollowPost = await DAO.find_and_update_database(
        Model.post,
        { _id: payload._id },
        { $inc: { post_follower_count: -1 } },
        { new: true }
      );

      const update_userpost_following = await DAO.find_and_update_database(
        Model.user,
        { _id: user._id },
        { $inc: { post_following_count: -1 } },
        { new: true }
      );

      return { msg: "unfollowed" };
    } else {
      const updatedPost = await DAO.find_and_update_database(
        Model.post,
        { _id: payload._id },
        { $inc: { post_follower_count: 1 } },
        { new: true }
      );

      const updatedUser = await DAO.find_and_update_database(
        Model.user,
        { _id: user._id },
        { $inc: { post_following_count: 1 } },
        { new: true }
      );

      const post_valid_for_time = await timeLeft(updatedPost);

      const follower_data = {
        followedBy: user._id,
        postId: payload._id,
      };

      const saveFollower = await DAO.save_data(
        Model.postFollower,
        follower_data
      );
      let folowData = {
        userId: updatedPost.userId,
        followerId: user._id,
      };
      await notification.follow_post(folowData);
      return { saveFollower, post_valid_for_time };
    }
  } catch (err) {
    console.log(err);
    throw err;
  }
};

// vote
const vote = async (payload, user) => {
  try {
    const alreadyVoted = await DAO.get_single_data(Model.vote, {
      voterId: user._id,
      postId: payload._id,
    });

    if (alreadyVoted) {
      return { msg: "Already voted", alreadyVoted };
    }

    const post = await DAO.get_single_data(Model.post, {
      _id: payload._id,
      participant_joined: true, // only vote if participant has joined
    });

    const voteData = {
      postId: post._id,
      voterId: user._id,
      voteTo: payload.voteTo,
      userId: post.userId, // only req for notification not for the vote
    };

    const newVote = await DAO.save_data(Model.vote, voteData);

    // Increment the voter's vote count
    const updatedcount = await DAO.find_and_update_database(
      Model.user,
      { _id: user._id },
      { $inc: { totalvote_count: 1 } },
      { new: true }
    );

    console.log("New Vote Data:", newVote);

    if (newVote.voteTo.toString() === post.userId.toString()) {
      // Increment the creator's vote count
      const updatedPost = await DAO.find_and_update_database(
        Model.post,
        { _id: newVote.postId },
        { $inc: { creator_post_vote_count: 1 } },
        { new: true }
      );

      console.log("Updated Post Data:", updatedPost);
    } else if (newVote.voteTo.toString() === post.participant_id.toString()) {
      // Increment the opposing post's vote count
      const updatedPost = await DAO.find_and_update_database(
        Model.post,
        { _id: newVote.postId },
        { $inc: { participant_post_vote_count: 1 } },
        { new: true }
      );

      console.log("Updated Post Data:", updatedPost);
    }
    await notification.vote_post(voteData);
    return newVote;
  } catch (err) {
    console.error("Error in voting:", err);
    throw err;
  }
};

// get post result
const post_result = async (payload) => {
  try {
    await get_result();

    // Single call to retrieve information for the given post and populate data
    let postDetails = await DAO.populate_data(
      Model.result,
      { postId: payload._id },
      {
        path: "postId",
        select: [
          "creator_post_vote_count",
          "discription",
          "participant_post_vote_count",
          "participant_post_discription",
        ],
      }
    );

    // Extract specific properties
    // let get_result_for_given_post = postDetails;
    // console.log("get_result_for_given_post", get_result_for_given_post);
    // let creator = {
    //   creator_post_vote_count: postDetails.creator_post_vote_count,
    //   discription: postDetails.discription,
    // };
    // let participant = {
    //   participant_post_vote_count: postDetails.participant_post_vote_count,
    //   participant_post_discription: postDetails.participant_post_discription,
    // };
    // console.log({ creator, participant });
    return { postDetails };
  } catch (err) {
    throw err;
  }
};

// get result list
const getResultList = async (payload, user) => {
  try {
    let resultType = payload.resultType;
    let is_friend = await is_friend(user._id);
    let listing = [];
    // If there is at least one friend relationship
    if (is_friend.length) {
      // Define the query based on the resultType
      let resultQuery = {};
      if (resultType === "win") {
        resultQuery = { winnerId: payload._id };
      } else if (resultType === "loss") {
        resultQuery = { losserId: payload._id };
      } else if (resultType === "tie") {
        let get_post = await DAO.populate_data(
          Model.result,
          { is_tie: true },
          { path: "postId", select: "userId" }
        );
        if (get_post.toString() === payload._id.toString()) {
          return get_post;
        }
      }

      // Retrieve the list of results based on the query
      listing = await DAO.get_all_data(Model.result, resultQuery);
      count = await DAO.count_data(Model.result, resultQuery);
    }

    return { listing, count }; // This will be null if the user is not allowed or if there are no matching results
  } catch (err) {
    console.log(err);
    throw err;
  }
};

// add and edit comment on a post
const comment = async (payload, user) => {
  try {
    let update_data = payload.discription;
    let update_if_commented = await DAO.find_and_update_database(
      Model.comment,
      { _id: payload._id },
      update_data,
      { new: true }
    );
    if (update_if_commented) {
      return update_if_commented;
    } else {
      let save_data = {
        postId: payload.postId,
        commentBy: user._id,
        discription: payload.discription,
      };
      const new_comment = await DAO.save_data(Model.comment, save_data);
      await notification.comment_post(save_data);
      return new_comment;
    }
  } catch (err) {
    console.log(err);
    throw err;
  }
};

const reply_to_comment = async (payload, user) => {
  try {
    let update_data = payload.discription;
    let update_if_commented = await DAO.find_and_update_database(
      Model.commentReply,
      { _id: payload._id },
      update_data,
      { new: true }
    );
    if (update_if_commented) {
      return update_if_commented;
    } else {
      let save_data = {
        postId: payload.postId,
        commentId: payload.commentId,
        replyBy: user._id,
        message: payload.message,
      };
      const new_comment = await DAO.save_data(Model.commentReply, save_data);
      await notification.commentReply(save_data);
      return new_comment;
    }
  } catch (err) {
    console.log(err);
    throw err;
  }
};

// vier user profile
const viewprofile = async (payload) => {
  try {
    let getProfile = await DAO.get_single_data(Model.user, {
      _id: payload.userId,
      isDeleted: payload.isDeleted,
    });
    let showDetails = {
      name: getProfile.name,
      bio: getProfile.bio,
      gender: getProfile.gender,
      userName: getProfile.userName,
      image: getProfile.image,
      totalvote_count: getProfile.totalvote_count,
      post_following_count: getProfile.post_following_count,
      friendsCount: getProfile.friendsCount,
      totalvote_count: getProfile.totalvote_count,
    };
    return showDetails;
  } catch (err) {
    throw err;
  }
};

// global search
const search_user = async (payload) => {
  try {
    const to_find = new RegExp(payload.search, "i"); // 'i' for case-insensitive
    let get_user = await DAO.get_all_data(Model.user, {
      $or: [
        { name: { $regex: to_find } },
        { email: { $regex: to_find } },
        { username: { $regex: to_find } },
        { phoneNumber: { $regex: to_find } },
        // Add more patterns as needed
      ],
    });
    return get_user;
  } catch (err) {
    throw err;
  }
};

// user friendlist search

const search_friend = async (payload, currentUser) => {
  try {
    // search desired
    const searchTermRegex = new RegExp(payload.search, "i");
    const foundUser = await DAO.get_single_data(Model.user, {
      $or: [
        { name: { $regex: searchTermRegex } },
        { email: { $regex: searchTermRegex } },
        { username: { $regex: searchTermRegex } },
        { phoneNumber: { $regex: searchTermRegex } },
      ],
    });
    /* check if found and if the found is the friend of the searched user fried list and
    the viewer is the friend of the searched user */
    if (
      foundUser &&
      (await is_friend(foundUser._id)) &&
      (await is_friend(currentUser._id))
    ) {
      return foundUser;
    }
  } catch (err) {
    throw err;
  }
};

//user result listing
let winList = async (payload, user) => {
  try {
    let query = [
      await aggregate_.result.lookup_win(),
      await aggregate_.result.unwind_win(),
      await aggregate_.result.lookup_post_win(),
      await aggregate_.result.unwind_win_post(),
      // await aggregate_.result.match_data(user),// for user specific
      await aggregate_.result.group_data(),
      await aggregate_.result.project_win(),
      // await aggregate_.result.sort_data(),
    ];
    console.log("query", query);

    let listing = await Model.user.aggregate(query);
    console.log("listing", listing);

    return listing;
  } catch (err) {
    console.error(err);
    throw err;
  }
};
//user result listing
let losseList = async (payload, user) => {
  try {
    let query = [
      await aggregate_.result.lookup_losse(),
      await aggregate_.result.unwind_losse(),
      await aggregate_.result.lookup_post_losse(),
      await aggregate_.result.unwind_losse_post(),
      // await aggregate_.result.match_data(user),// for user specific
      await aggregate_.result.group_data(),
      await aggregate_.result.project_losse(),
      // await aggregate_.result.sort_data(),
    ];
    console.log("query", query);

    let listing = await Model.user.aggregate(query);
    console.log("listing", listing);

    return listing;
  } catch (err) {
    console.error(err);
    throw err;
  }
};
//user result listing
let tieList = async (payload, user) => {
  try {
    let query = [
      await aggregate_.result.lookup_tie(),
      await aggregate_.result.unwind_tie(),
      await aggregate_.result.lookup_post_tie(),
      await aggregate_.result.unwind_tie_post(),
      // await aggregate_.result.match_data(user),// for user specific
      await aggregate_.result.group_data(),
      await aggregate_.result.project_tie(),
      // await aggregate_.result.sort_data(),
    ];
    console.log("query", query);

    let listing = await Model.user.aggregate(query);
    console.log("listing", listing);

    return listing;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

// my notifications
const myNotifications = async (user) => {
  try {
    let listing = await DAO.get_all_data(Model.notification, {
      reciver_id: user._id,
    });
    return listing;
  } catch (err) {
    throw err;
  }
};

module.exports = {
  Login_signUp,
  social_login,
  logout,
  setUp_Profile,
  edit_Profile,
  viewonBoarding,
  verifyOtp,
  get_privacyPolicy,
  get_termsConditions,
  suggest_username,
  add_edit_post,
  delete_posts,
  send_friendreq,
  respond_to_friend_req,
  remove_friend,
  userfriendList,
  myprofile,
  get_followed_posts,
  participant_post_upload,
  reply_to_post,
  save_post_followers,
  vote,
  viewprofile,
  homepage_posts,
  post_result,
  getResultList,
  comment,
  reply_to_comment,
  search_user,
  search_friend,
  winList,
  losseList,
  tieList,
  myNotifications,
};
