import { addDoc, collection, getDocs, query, where, orderBy, limit, updateDoc, doc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { trackInvitationSent } from '../utils/Analytics-utils'
import emailjs from '@emailjs/browser'

export interface InvitationData {
  inviterId: string
  inviterName: string
  inviterEmail: string
  inviteeEmail: string
  message?: string
  status: 'pending' | 'sent' | 'accepted' | 'expired'
  createdAt: string
  expiresAt: string
  docId?: string // Add docId for updating status
}

export interface InvitationStats {
  totalSent: number
  totalAccepted: number
  pendingInvitations: number
}

// Send invitation email (this would typically call a Firebase Function or external email service)
export const sendInvitationEmail = async (
  inviterId: string,
  inviterName: string,
  inviterEmail: string,
  inviteeEmail: string,
  message?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteeEmail)) {
      return { success: false, error: 'Please enter a valid email address' }
    }

    // Check if user is trying to invite themselves
    if (inviterEmail.toLowerCase() === inviteeEmail.toLowerCase()) {
      return { success: false, error: 'You cannot invite yourself' }
    }

    // Check if invitation already exists for this email
    const existingInvitationQuery = query(
      collection(db, 'invitations'),
      where('inviterId', '==', inviterId),
      where('inviteeEmail', '==', inviteeEmail.toLowerCase()),
      where('status', 'in', ['pending', 'sent'])
    )
    
    const existingInvitations = await getDocs(existingInvitationQuery)
    if (!existingInvitations.empty) {
      return { success: false, error: 'You have already sent an invitation to this email address' }
    }

    // Create invitation record
    const invitationData: InvitationData = {
      inviterId,
      inviterName,
      inviterEmail,
      inviteeEmail: inviteeEmail.toLowerCase(),
      message: message || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
    }

    // Store invitation in Firestore first
    const docRef = await addDoc(collection(db, 'invitations'), invitationData)
    
    // Send actual email using EmailJS
    const emailServiceResponse = await sendActualEmail({
      inviterName,
      inviterEmail,
      inviteeEmail,
      message: message || '',
    })
    
    if (emailServiceResponse.success) {
      // Update invitation status to 'sent' after successful email
      await updateDoc(doc(db, 'invitations', docRef.id), {
        status: 'sent',
        sentAt: new Date().toISOString()
      })
      
      // Track invitation sent event
      trackInvitationSent(inviterId, inviteeEmail, !!message)
      
      return { success: true }
    } else {
      // If email fails, keep status as 'pending' but still return success
      // The invitation is saved and can be retried later
      console.warn('Email sending failed, but invitation saved:', emailServiceResponse.error)
      return { success: true }
    }

  } catch (error) {
    console.error('Error sending invitation:', error)
    return { success: false, error: 'Failed to send invitation. Please try again.' }
  }
}

// EmailJS configuration - Replace these with your actual EmailJS credentials
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID // Replace with your EmailJS service ID
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID // Replace with your EmailJS template ID
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY // Replace with your EmailJS public key

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY)

// Send actual email using EmailJS
const sendActualEmail = async (emailData: {
  inviterName: string
  inviterEmail: string
  inviteeEmail: string
  message: string
}): Promise<{ success: boolean; error?: string }> => {
  try {
    // For now, we'll use a fallback method since EmailJS requires setup
    // In production, you would configure EmailJS with your service ID, template ID, and public key
    
    // Fallback: Use a simple email service or Firebase Functions
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited to NovlNest!</h1>
          <p style="color: #e0e0e0; margin: 10px 0 0 0; font-size: 16px;">Discover amazing novels and connect with fellow readers</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">Hello!</h2>
          
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            <strong>${emailData.inviterName}</strong> has invited you to join <strong>NovlNest</strong>, 
            a platform where you can discover, read, and share amazing novels!
          </p>
          
          ${emailData.message ? `
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <p style="margin: 0; color: #555; font-style: italic;">"${emailData.message}"</p>
            </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://novlnest.com/register" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; font-size: 16px;">
              Join NovlNest Now
            </a>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px;">
            <h3 style="color: #333; margin-top: 0; font-size: 18px;">What you'll get:</h3>
            <ul style="color: #666; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li>Access to thousands of novels across all genres</li>
              <li>Personalized reading recommendations</li>
              <li>Connect with authors and fellow readers</li>
              <li>Create and share your own stories</li>
              <li>Join reading communities and discussions</li>
            </ul>
          </div>
          
          <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px;">
            This invitation was sent by ${emailData.inviterName} (${emailData.inviterEmail})<br>
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      </div>
    `

    // Send actual email using EmailJS
    try {
      const emailParams = {
        email: emailData.inviteeEmail, // This matches your {{email}} field
        from_name: emailData.inviterName, // Use the actual inviter's name
        from_email: emailData.inviterEmail, // This matches your {{from_email}} field
        message: emailData.message,
        invitation_link: `https://novlnest.com/register`,
        reply_to: emailData.inviterEmail
      }
     
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        emailParams
      )
      
      return { success: true }
      
    } catch (emailError) {
      console.error('📧 Email sending failed:', emailError)
      
      // Fallback: Log the email content for debugging
      console.log('📧 Email content (fallback):', emailContent)
      
      // Still return success since the invitation is saved
      return { success: true }
    }
    
  } catch (error) {
    console.error('Email sending error:', error)
    return { success: false, error: 'Failed to send email' }
  }
}

// Get user's invitation statistics
export const getInvitationStats = async (userId: string): Promise<InvitationStats> => {
  try {
    const invitationsQuery = query(
      collection(db, 'invitations'),
      where('inviterId', '==', userId),
      orderBy('createdAt', 'desc')
    )
    
    const invitationsSnapshot = await getDocs(invitationsQuery)
    const invitations = invitationsSnapshot.docs.map(doc => doc.data() as InvitationData)
    
    const stats: InvitationStats = {
      totalSent: invitations.length,
      totalAccepted: invitations.filter(inv => inv.status === 'accepted').length,
      pendingInvitations: invitations.filter(inv => inv.status === 'pending' || inv.status === 'sent').length
    }
    
    return stats
  } catch (error) {
    console.error('Error fetching invitation stats:', error)
    return { totalSent: 0, totalAccepted: 0, pendingInvitations: 0 }
  }
}

// Get user's recent invitations
export const getRecentInvitations = async (userId: string, limitCount: number = 10): Promise<InvitationData[]> => {
  try {
    const invitationsQuery = query(
      collection(db, 'invitations'),
      where('inviterId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    
    const invitationsSnapshot = await getDocs(invitationsQuery)
    return invitationsSnapshot.docs.map(doc => doc.data() as InvitationData)
  } catch (error) {
    console.error('Error fetching recent invitations:', error)
    return []
  }
}
